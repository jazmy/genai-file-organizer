'use client';

import { useCallback, useRef } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { useProcessingStore } from '@/stores/processingStore';
import { useUIStore } from '@/stores/uiStore';
import { useHistoryStore } from '@/stores/historyStore';
import { processFile, applyChanges, clearAppliedFiles, markFilesAsSkipped, updateSuggestedName } from '@/lib/api/files';
import { getConfig } from '@/lib/api/config';
import {
  createQueue,
  getPendingQueue,
  markQueueJobComplete,
  markQueueJobFailed,
} from '@/lib/api/processing';
import { recordFeedback } from '@/lib/api/logs';
import type { PendingQueueResponse } from '@/types/api';

export function useProcessing() {
  const {
    currentPath,
    selectedFiles,
    results,
    addResult,
    removeResult,
    updateResult,
    markComplete,
    clearSelection,
    renameFileInList,
  } = useFileStore();

  const {
    startBatch,
    setProgress,
    endBatch,
    setRegenerating,
    startApplying,
    endApplying,
  } = useProcessingStore();

  const { addToast } = useUIStore();
  const { pushAction } = useHistoryStore();
  
  // Track completed count for parallel processing
  const completedCountRef = useRef(0);

  // Process a single file and return result
  const processOneFile = async (
    filePath: string,
    batchId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await processFile(filePath, true, false);
      addResult(filePath, result);

      if (result.success) {
        await markQueueJobComplete(batchId, filePath);
        return { success: true };
      } else {
        await markQueueJobFailed(batchId, filePath, result.error || 'Unknown error');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      await markQueueJobFailed(batchId, filePath, errorMessage);
      addResult(filePath, {
        success: false,
        filePath,
        originalName: filePath.split('/').pop() || '',
        suggestedName: '',
        category: '',
        extension: '',
        processingTime: 0,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  // Process selected files with parallel processing
  const previewSelected = useCallback(async () => {
    // Get current state to avoid stale closure issues
    const { selectedFiles: currentSelectedFiles, currentPath: path, clearSelection: clear } = useFileStore.getState();
    const filesToProcess = Array.from(currentSelectedFiles);
    if (filesToProcess.length === 0) return;

    try {
      // Get parallel processing setting from config
      const config = await getConfig();
      const parallelCount = config.processing?.parallelFiles || 3;

      // Create queue in database
      const queueResult = await createQueue(filesToProcess, path);
      const batchId = queueResult.batchId;

      startBatch(filesToProcess, batchId);

      let successCount = 0;
      let errorCount = 0;
      completedCountRef.current = 0;

      // Process files in parallel batches
      for (let i = 0; i < filesToProcess.length; i += parallelCount) {
        const batch = filesToProcess.slice(i, i + parallelCount);

        // Process batch in parallel
        const results = await Promise.all(
          batch.map(filePath => processOneFile(filePath, batchId))
        );

        // Count results
        results.forEach(result => {
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        });

        // Update progress
        completedCountRef.current += batch.length;
        setProgress(completedCountRef.current, filesToProcess.length);
      }

      endBatch();
      clear();

      addToast({
        type: successCount > 0 ? 'success' : 'error',
        title: 'Processing Complete',
        message: `${successCount} succeeded, ${errorCount} failed`,
      });
    } catch (err) {
      endBatch();
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [startBatch, setProgress, endBatch, addToast]);

  // Regenerate a single file with optional feedback
  const regenerateFile = useCallback(
    async (filePath: string, feedback?: string) => {
      // Allow regeneration even during batch processing - it's an independent operation

      // Check if there's an existing suggestion being replaced (this is a rejection)
      // Access results directly from store to avoid stale closure issues
      const currentResults = useFileStore.getState().results;
      const existingResult = currentResults.get(filePath);
      const rejectedName = existingResult?.suggestedName;

      if (existingResult?.success && rejectedName) {
        // Record the old suggestion as rejected since user is requesting a new one
        try {
          await recordFeedback({
            filePath,
            action: 'rejected',
            finalName: rejectedName,
            feedback: feedback || undefined,
          });
        } catch {
          // Silently ignore feedback recording errors
        }
      }

      setRegenerating(filePath, true);

      try {
        // Pass regeneration options including feedback and rejected name
        const result = await processFile(filePath, true, false, {
          isRegeneration: true,
          feedback: feedback || undefined,
          rejectedName: rejectedName || undefined,
        });
        addResult(filePath, result);

        if (result.success) {
          addToast({
            type: 'success',
            title: 'Regenerated',
            message: `New name: ${result.suggestedName}`,
            duration: 3000,
          });
        }
      } catch (err) {
        console.error('Regeneration error:', err);
        addToast({
          type: 'error',
          title: 'Regeneration Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setRegenerating(filePath, false);
      }
    },
    [setRegenerating, addResult, addToast]
  );

  // Apply only selected files that have pending approval
  const applyAll = useCallback(async () => {
    // Get current state to avoid stale closure issues
    const { results: currentResults, selectedFiles: currentSelected } = useFileStore.getState();

    // Only apply selected files - do nothing if no files selected
    const selectedPaths = Array.from(currentSelected);
    if (selectedPaths.length === 0) return;

    // Filter to only selected files that have successful results
    const readyResults = Array.from(currentResults.entries())
      .filter(([path, result]) => result.success && selectedPaths.includes(path))
      .map(([path, result]) => ({
        filePath: path,
        suggestedName: result.suggestedName,
        originalName: result.originalName,
        aiSuggestedName: result.aiSuggestedName || result.suggestedName,
      }));

    if (readyResults.length === 0) return;

    startApplying(readyResults.length);

    try {
      const response = await applyChanges(readyResults);

      // Build history files array for undo using actual paths from server
      const historyFiles = response.results
        .filter(r => r.success && r.newPath)
        .map(r => ({
          originalPath: r.filePath,
          newPath: r.newPath!,
          originalName: r.originalName,
          newName: r.suggestedName,
        }));

      // Record batch rename for undo
      pushAction({
        type: 'batch_rename',
        description: `Renamed ${historyFiles.length} files`,
        files: historyFiles,
      });

      // Clear applied files from results and update file list
      // Use actual newPath from server (may be different directory if auto-organize moved file)
      const { removeResult: remove, renameFileInList: rename } = useFileStore.getState();
      response.results.forEach(r => {
        if (r.success && r.newPath) {
          remove(r.filePath);
          // Check if file was moved to a different directory
          const originalDir = r.filePath.substring(0, r.filePath.lastIndexOf('/'));
          const newDir = r.newPath.substring(0, r.newPath.lastIndexOf('/'));
          if (originalDir === newDir) {
            // Same directory - update the file in list
            rename(r.filePath, r.newPath, r.suggestedName);
          } else {
            // Different directory (auto-organize moved it) - remove from current list
            // It will appear as completed when user navigates to the destination
            const { files, completedFiles } = useFileStore.getState();
            const newFiles = files.filter(f => f.path !== r.filePath);
            const newCompleted = new Set(completedFiles);
            newCompleted.delete(r.filePath);
            // Don't add newPath to completed here - it's tracked in database
            useFileStore.setState({ files: newFiles, completedFiles: newCompleted });
          }
        }
      });

      // Clear from database cache
      const appliedPaths = readyResults.map((r) => r.filePath);
      await clearAppliedFiles(appliedPaths);

      // Record feedback for all applied files
      try {
        await Promise.all(
          readyResults.map(({ filePath, suggestedName, aiSuggestedName }) => {
            const wasEdited = aiSuggestedName !== suggestedName;
            return recordFeedback({
              filePath,
              action: wasEdited ? 'edited' : 'accepted',
              finalName: suggestedName,
            });
          })
        );
      } catch {
        // Silently ignore feedback recording errors
      }

      // Clear selection after successful apply
      useFileStore.getState().clearSelection();

      addToast({
        type: 'success',
        title: 'Changes Applied',
        message: `${readyResults.length} files renamed`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Apply Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      endApplying();
    }
  }, [addToast, pushAction, startApplying, endApplying]);

  // Apply a single file
  const applySingle = useCallback(
    async (filePath: string, suggestedName: string) => {
      try {
        // Get current state to avoid stale closure issues
        const { results: currentResults, removeResult: remove, renameFileInList: rename } = useFileStore.getState();

        // Get the original result to check if name was edited
        const originalResult = currentResults.get(filePath);
        // Compare against aiSuggestedName (original AI suggestion) to detect user edits
        const aiOriginalName = originalResult?.aiSuggestedName || originalResult?.suggestedName;
        const wasEdited = originalResult && aiOriginalName !== suggestedName;
        const originalName = originalResult?.originalName || filePath.split('/').pop() || '';

        const response = await applyChanges([{ filePath, suggestedName }]);
        const result = response.results[0];

        if (!result?.success || !result.newPath) {
          throw new Error(result?.error || 'Rename failed');
        }

        // Use actual newPath from server (may be different if auto-organize moved file)
        const newPath = result.newPath;

        // Record rename for undo
        pushAction({
          type: 'rename',
          description: `Renamed "${originalName}" to "${suggestedName}"`,
          originalPath: filePath,
          newPath,
        });

        remove(filePath);

        // Check if file was moved to a different directory
        const originalDir = filePath.substring(0, filePath.lastIndexOf('/'));
        const newDir = newPath.substring(0, newPath.lastIndexOf('/'));
        if (originalDir === newDir) {
          // Same directory - update the file in list
          rename(filePath, newPath, suggestedName);
        } else {
          // Different directory (auto-organize moved it) - remove from current list
          const { files, completedFiles } = useFileStore.getState();
          const newFiles = files.filter(f => f.path !== filePath);
          const newCompleted = new Set(completedFiles);
          newCompleted.delete(filePath);
          useFileStore.setState({ files: newFiles, completedFiles: newCompleted });
        }

        await clearAppliedFiles([filePath]);

        // Record feedback for analytics
        try {
          await recordFeedback({
            filePath,
            action: wasEdited ? 'edited' : 'accepted',
            finalName: suggestedName,
          });
        } catch {
          // Silently ignore feedback recording errors
        }

        addToast({
          type: 'success',
          title: 'Renamed',
          message: suggestedName,
          duration: 3000,
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Rename Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [addToast, pushAction]
  );

  // Keep original name - persists to database
  const keepOriginal = useCallback(
    async (filePath: string) => {
      try {
        // Save to database first
        await markFilesAsSkipped([filePath]);

        // Get current state to avoid stale closure issues
        const { removeResult: remove, markComplete: complete } = useFileStore.getState();

        // Then update local state
        remove(filePath);
        complete(filePath);

        // Record feedback for analytics
        try {
          await recordFeedback({
            filePath,
            action: 'skipped',
          });
        } catch {
          // Silently ignore feedback recording errors
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed',
          message: err instanceof Error ? err.message : 'Failed to mark as keep original',
        });
      }
    },
    [addToast]
  );

  // Bulk keep original - marks selected files as skipped in database
  const keepOriginalSelected = useCallback(async () => {
    // Get current state to avoid stale closure issues
    const currentSelectedFiles = useFileStore.getState().selectedFiles;
    const filesToSkip = Array.from(currentSelectedFiles);
    if (filesToSkip.length === 0) return;

    try {
      const result = await markFilesAsSkipped(filesToSkip);

      // Mark all as complete locally using store actions
      const { removeResult: remove, markComplete: complete, clearSelection: clear } = useFileStore.getState();
      filesToSkip.forEach((path) => {
        remove(path);
        complete(path);
      });

      clear();

      // Record feedback for all skipped files
      try {
        await Promise.all(
          filesToSkip.map((filePath) =>
            recordFeedback({
              filePath,
              action: 'skipped',
            })
          )
        );
      } catch {
        // Silently ignore feedback recording errors
      }

      addToast({
        type: 'success',
        title: 'Marked as Complete',
        message: `${result.count} files marked as "keep original"`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [addToast]);

  // Edit suggested name - persists to database
  const editSuggestedName = useCallback(
    async (filePath: string, newName: string) => {
      // Update local state immediately for responsiveness
      updateResult(filePath, { suggestedName: newName });

      // Persist to database
      try {
        await updateSuggestedName(filePath, newName);
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed to save',
          message: err instanceof Error ? err.message : 'Failed to save edited name',
        });
      }
    },
    [updateResult, addToast]
  );

  // Check for pending queue (used on app startup)
  const checkPendingQueue = useCallback(async (): Promise<PendingQueueResponse | null> => {
    try {
      const pendingQueue = await getPendingQueue();
      if (pendingQueue.hasPending && pendingQueue.files.length > 0) {
        return pendingQueue;
      }
      return null;
    } catch (err) {
      console.error('Failed to check pending queue:', err);
      return null;
    }
  }, []);

  // Resume processing from pending queue
  const resumeProcessing = useCallback(async (pendingQueue: PendingQueueResponse) => {
    const filesToProcess = pendingQueue.files;
    const batchId = pendingQueue.batchId;

    if (!batchId || filesToProcess.length === 0) {
      addToast({
        type: 'info',
        title: 'No files to resume',
        message: 'The processing queue is empty',
      });
      return;
    }

    try {
      // Get parallel processing setting from config
      const config = await getConfig();
      const parallelCount = config.processing?.parallelFiles || 3;

      // Start batch with remaining files
      startBatch(filesToProcess, batchId);

      let successCount = 0;
      let errorCount = 0;
      completedCountRef.current = 0;

      addToast({
        type: 'info',
        title: 'Resuming Processing',
        message: `Processing ${filesToProcess.length} remaining files...`,
        duration: 3000,
      });

      // Process files in parallel batches
      for (let i = 0; i < filesToProcess.length; i += parallelCount) {
        const batch = filesToProcess.slice(i, i + parallelCount);

        // Process batch in parallel
        const results = await Promise.all(
          batch.map(filePath => processOneFile(filePath, batchId))
        );

        // Count results
        results.forEach(result => {
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        });

        // Update progress
        completedCountRef.current += batch.length;
        setProgress(completedCountRef.current, filesToProcess.length);
      }

      endBatch();

      addToast({
        type: successCount > 0 ? 'success' : 'error',
        title: 'Processing Complete',
        message: `${successCount} succeeded, ${errorCount} failed`,
      });
    } catch (err) {
      endBatch();
      addToast({
        type: 'error',
        title: 'Resume Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [startBatch, setProgress, endBatch, addResult, addToast]);

  return {
    previewSelected,
    regenerateFile,
    applyAll,
    applySingle,
    keepOriginal,
    keepOriginalSelected,
    editSuggestedName,
    checkPendingQueue,
    resumeProcessing,
  };
}
