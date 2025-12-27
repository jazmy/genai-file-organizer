'use client';

import { useCallback, useEffect } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { API_BASE } from '@/lib/api/client';

interface UndoResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for managing undo/redo functionality for file operations
 */
export function useUndo() {
  const { pushAction, undo, redo, canUndo, canRedo, getHistory, clearHistory } = useHistoryStore();
  const { loadFiles, currentPath } = useFileStore();
  const { addToast } = useUIStore();

  // Perform an undo operation
  const performUndo = useCallback(async (): Promise<UndoResult> => {
    if (!canUndo()) {
      return { success: false, error: 'Nothing to undo' };
    }

    const action = undo();
    if (!action) {
      return { success: false, error: 'Failed to get undo action' };
    }

    try {
      switch (action.type) {
        case 'rename': {
          if (!action.newPath || !action.originalPath) {
            return { success: false, error: 'Invalid rename action' };
          }
          // Rename back to original
          const response = await fetch(`${API_BASE}/api/files/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldPath: action.newPath,
              newPath: action.originalPath,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to undo rename');
          }

          await loadFiles(currentPath);
          addToast({
            title: 'Undo',
            message: action.description,
            type: 'success',
          });
          return { success: true };
        }

        case 'batch_rename': {
          if (!action.files || action.files.length === 0) {
            return { success: false, error: 'Invalid batch rename action' };
          }

          // Rename all files back to original
          const results = await Promise.all(
            action.files.map(async (file) => {
              if (!file.newPath) return { success: false };
              const response = await fetch(`${API_BASE}/api/files/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  oldPath: file.newPath,
                  newPath: file.originalPath,
                }),
              });
              return { success: response.ok };
            })
          );

          const successCount = results.filter((r) => r.success).length;
          await loadFiles(currentPath);

          if (successCount === action.files.length) {
            addToast({
              title: 'Undo',
              message: `${action.files.length} file renames undone`,
              type: 'success',
            });
          } else {
            addToast({
              title: 'Partial Undo',
              message: `${successCount}/${action.files.length} files undone`,
              type: 'warning',
            });
          }
          return { success: true };
        }

        case 'edit_name': {
          // For edit operations, we don't need to call the server
          // The suggested name is stored in state
          addToast({
            title: 'Undo',
            message: 'Name edit undone',
            type: 'success',
          });
          return { success: true };
        }

        case 'keep_original':
        case 'delete': {
          // These can't be undone from the client
          addToast({
            title: 'Cannot Undo',
            message: `${action.type} operation cannot be undone`,
            type: 'error',
          });
          return { success: false, error: 'Operation cannot be undone' };
        }

        default:
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Undo failed';
      addToast({
        title: 'Undo Failed',
        message,
        type: 'error',
      });
      return { success: false, error: message };
    }
  }, [canUndo, undo, loadFiles, currentPath, addToast]);

  // Perform a redo operation
  const performRedo = useCallback(async (): Promise<UndoResult> => {
    if (!canRedo()) {
      return { success: false, error: 'Nothing to redo' };
    }

    const action = redo();
    if (!action) {
      return { success: false, error: 'Failed to get redo action' };
    }

    try {
      switch (action.type) {
        case 'rename': {
          if (!action.newPath || !action.originalPath) {
            return { success: false, error: 'Invalid rename action' };
          }
          // Rename back to new name
          const response = await fetch(`${API_BASE}/api/files/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldPath: action.originalPath,
              newPath: action.newPath,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to redo rename');
          }

          await loadFiles(currentPath);
          addToast({
            title: 'Redo',
            message: action.description,
            type: 'success',
          });
          return { success: true };
        }

        case 'batch_rename': {
          if (!action.files || action.files.length === 0) {
            return { success: false, error: 'Invalid batch rename action' };
          }

          // Rename all files back to new names
          const results = await Promise.all(
            action.files.map(async (file) => {
              if (!file.newPath) return { success: false };
              const response = await fetch(`${API_BASE}/api/files/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  oldPath: file.originalPath,
                  newPath: file.newPath,
                }),
              });
              return { success: response.ok };
            })
          );

          const successCount = results.filter((r) => r.success).length;
          await loadFiles(currentPath);

          if (successCount === action.files.length) {
            addToast({
              title: 'Redo',
              message: `${action.files.length} file renames redone`,
              type: 'success',
            });
          } else {
            addToast({
              title: 'Partial Redo',
              message: `${successCount}/${action.files.length} files redone`,
              type: 'warning',
            });
          }
          return { success: true };
        }

        default:
          return { success: false, error: 'Operation cannot be redone' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redo failed';
      addToast({
        title: 'Redo Failed',
        message,
        type: 'error',
      });
      return { success: false, error: message };
    }
  }, [canRedo, redo, loadFiles, currentPath, addToast]);

  // Record a rename action
  const recordRename = useCallback(
    (originalPath: string, newPath: string, originalName: string, newName: string) => {
      pushAction({
        type: 'rename',
        description: `Renamed "${originalName}" to "${newName}"`,
        originalPath,
        newPath,
      });
    },
    [pushAction]
  );

  // Record a batch rename action
  const recordBatchRename = useCallback(
    (
      files: Array<{
        originalPath: string;
        newPath: string;
        originalName: string;
        newName: string;
      }>
    ) => {
      pushAction({
        type: 'batch_rename',
        description: `Renamed ${files.length} files`,
        files,
      });
    },
    [pushAction]
  );

  // Record a keep original action (for history tracking, but can't undo)
  const recordKeepOriginal = useCallback(
    (filePath: string, fileName: string) => {
      pushAction({
        type: 'keep_original',
        description: `Kept original name: "${fileName}"`,
        originalPath: filePath,
      });
    },
    [pushAction]
  );

  // Record a delete action (for history tracking, but can't undo)
  const recordDelete = useCallback(
    (filePath: string, fileName: string) => {
      pushAction({
        type: 'delete',
        description: `Deleted "${fileName}"`,
        originalPath: filePath,
      });
    },
    [pushAction]
  );

  // Set up keyboard shortcuts and custom events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if focused on input
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
          return;
        }
        if (activeElement.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      // Ctrl/Cmd + Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        performUndo();
        return;
      }

      // Ctrl/Cmd + Shift + Z for redo (or Ctrl/Cmd + Y)
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault();
        performRedo();
        return;
      }
    };

    // Handle custom events from HistoryPanel
    const handleUndoEvent = () => performUndo();
    const handleRedoEvent = () => performRedo();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('history:undo', handleUndoEvent);
    window.addEventListener('history:redo', handleRedoEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('history:undo', handleUndoEvent);
      window.removeEventListener('history:redo', handleRedoEvent);
    };
  }, [performUndo, performRedo]);

  return {
    // Actions
    performUndo,
    performRedo,
    recordRename,
    recordBatchRename,
    recordKeepOriginal,
    recordDelete,
    clearHistory,
    // State
    canUndo: canUndo(),
    canRedo: canRedo(),
    history: getHistory(),
  };
}

export default useUndo;
