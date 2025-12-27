'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  Folder,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  Pencil,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { FilePreviewModal, type ProcessingInfo } from '@/components/modals/FilePreviewModal';
import { getAllPendingFiles, applyChanges, clearAppliedFiles, markFilesAsSkipped, processFile, updateSuggestedName, type PendingFile } from '@/lib/api/files';
import { recordFeedback } from '@/lib/api/logs';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils/cn';
import { isImageFile } from '@/lib/utils/fileHelpers';
import { API_BASE } from '@/lib/api/client';
import type { FileItem } from '@/types/files';

interface GroupedFiles {
  [directory: string]: PendingFile[];
}

export default function ReadyToApplyPage() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set());
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewProcessingInfo, setPreviewProcessingInfo] = useState<ProcessingInfo | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ path: string; x: number; y: number } | null>(null);
  const { addToast } = useUIStore();

  // Ref to track in-progress regenerations (avoids stale closure issues)
  const regeneratingRef = useRef<Set<string>>(new Set());

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllPendingFiles();
      setFiles(data.files);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to load files',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Group files by directory
  const groupedFiles: GroupedFiles = files.reduce((acc, file) => {
    const dir = file.original_path.substring(0, file.original_path.lastIndexOf('/'));
    if (!acc[dir]) {
      acc[dir] = [];
    }
    acc[dir].push(file);
    return acc;
  }, {} as GroupedFiles);

  // Convert PendingFile to FileItem for preview modal
  const convertToFileItem = useCallback((file: PendingFile): FileItem => {
    return {
      name: file.original_name,
      path: file.original_path,
      isDirectory: false,
      isSupported: true,
      size: 0,
      sizeKB: 0,
      modified: file.created_at,
    };
  }, []);

  // Get all previewable files for navigation
  const previewableFiles = useMemo(() => {
    return files.filter(f => isImageFile(f.original_name)).map(convertToFileItem);
  }, [files, convertToFileItem]);

  const handlePreview = useCallback((file: PendingFile) => {
    setPreviewFile(convertToFileItem(file));
    setPreviewProcessingInfo({
      suggestedName: file.suggested_name,
      aiSuggestedName: file.ai_suggested_name,
      category: file.category,
      error: file.error,
    });
  }, [convertToFileItem]);

  const handlePreviewClose = useCallback(() => {
    setPreviewFile(null);
    setPreviewProcessingInfo(null);
  }, []);

  const handlePreviewNext = useCallback(() => {
    if (!previewFile) return;
    const currentIndex = previewableFiles.findIndex(f => f.path === previewFile.path);
    if (currentIndex < previewableFiles.length - 1) {
      const nextFile = previewableFiles[currentIndex + 1];
      setPreviewFile(nextFile);
      // Find the corresponding PendingFile to get processing info
      const pendingFile = files.find(f => f.original_path === nextFile.path);
      if (pendingFile) {
        setPreviewProcessingInfo({
          suggestedName: pendingFile.suggested_name,
          aiSuggestedName: pendingFile.ai_suggested_name,
          category: pendingFile.category,
          error: pendingFile.error,
        });
      }
    }
  }, [previewFile, previewableFiles, files]);

  const handlePreviewPrev = useCallback(() => {
    if (!previewFile) return;
    const currentIndex = previewableFiles.findIndex(f => f.path === previewFile.path);
    if (currentIndex > 0) {
      const prevFile = previewableFiles[currentIndex - 1];
      setPreviewFile(prevFile);
      // Find the corresponding PendingFile to get processing info
      const pendingFile = files.find(f => f.original_path === prevFile.path);
      if (pendingFile) {
        setPreviewProcessingInfo({
          suggestedName: pendingFile.suggested_name,
          aiSuggestedName: pendingFile.ai_suggested_name,
          category: pendingFile.category,
          error: pendingFile.error,
        });
      }
    }
  }, [previewFile, previewableFiles, files]);

  const hasPreviewNext = useMemo(() => {
    if (!previewFile) return false;
    const currentIndex = previewableFiles.findIndex(f => f.path === previewFile.path);
    return currentIndex < previewableFiles.length - 1;
  }, [previewFile, previewableFiles]);

  const hasPreviewPrev = useMemo(() => {
    if (!previewFile) return false;
    const currentIndex = previewableFiles.findIndex(f => f.path === previewFile.path);
    return currentIndex > 0;
  }, [previewFile, previewableFiles]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, file: PendingFile) => {
    if (isImageFile(file.original_name)) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoverPreview({
        path: file.original_path,
        x: rect.left - 210,
        y: rect.top,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPreview(null);
  }, []);

  // Edit name handlers
  const handleStartEdit = useCallback((file: PendingFile) => {
    setEditingPath(file.original_path);
    setEditValue(file.suggested_name);
  }, []);

  const handleSaveEdit = useCallback(async (file: PendingFile) => {
    if (!editValue.trim() || editValue.trim() === file.suggested_name) {
      setEditingPath(null);
      setEditValue('');
      return;
    }

    try {
      await updateSuggestedName(file.original_path, editValue.trim());
      // Record as edited feedback
      await recordFeedback({
        filePath: file.original_path,
        action: 'edited',
        finalName: editValue.trim(),
      });
      // Update local state
      setFiles(prev => prev.map(f =>
        f.original_path === file.original_path
          ? { ...f, suggested_name: editValue.trim() }
          : f
      ));
      addToast({
        type: 'success',
        title: 'Name Updated',
        message: `Changed to: ${editValue.trim()}`,
        duration: 3000,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to update name',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setEditingPath(null);
      setEditValue('');
    }
  }, [editValue, addToast]);

  const handleCancelEdit = useCallback(() => {
    setEditingPath(null);
    setEditValue('');
  }, []);

  // Regenerate handler
  const handleRegenerate = useCallback(async (file: PendingFile) => {
    // Check if already regenerating this file (prevent double-clicks)
    // Use ref for synchronous check to avoid stale closure issues
    if (regeneratingRef.current.has(file.original_path)) {
      console.log('[Regenerate] Already regenerating:', file.original_path);
      return;
    }

    // Mark as regenerating in both ref (for sync check) and state (for UI)
    regeneratingRef.current.add(file.original_path);
    setRegenerating(prev => new Set(prev).add(file.original_path));

    try {
      // Record as rejected since we're getting a new suggestion
      // Don't let feedback errors block regeneration
      try {
        await recordFeedback({
          filePath: file.original_path,
          action: 'rejected',
          finalName: file.suggested_name,
        });
      } catch (feedbackErr) {
        console.warn('[Regenerate] Feedback recording failed:', feedbackErr);
      }

      const result = await processFile(file.original_path, true, false);

      if (result.success) {
        // Update local state with new suggestion
        setFiles(prev => prev.map(f =>
          f.original_path === file.original_path
            ? { ...f, suggested_name: result.suggestedName }
            : f
        ));
        addToast({
          type: 'success',
          title: 'Regenerated',
          message: `New name: ${result.suggestedName}`,
          duration: 3000,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Regeneration Failed',
          message: result.error || 'Unknown error',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Regeneration Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      // Clear from both ref and state
      regeneratingRef.current.delete(file.original_path);
      setRegenerating(prev => {
        const next = new Set(prev);
        next.delete(file.original_path);
        return next;
      });
    }
  }, [addToast]);

  const handleApplySingle = async (file: PendingFile) => {
    setApplying(prev => new Set(prev).add(file.original_path));
    try {
      await applyChanges([{
        filePath: file.original_path,
        suggestedName: file.suggested_name,
      }]);
      await clearAppliedFiles([file.original_path]);
      setFiles(prev => prev.filter(f => f.original_path !== file.original_path));
      addToast({
        type: 'success',
        title: 'Applied',
        message: `Renamed to ${file.suggested_name}`,
        duration: 3000,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to apply',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setApplying(prev => {
        const next = new Set(prev);
        next.delete(file.original_path);
        return next;
      });
    }
  };

  const handleSkipSingle = async (file: PendingFile) => {
    setApplying(prev => new Set(prev).add(file.original_path));
    try {
      await markFilesAsSkipped([file.original_path]);
      setFiles(prev => prev.filter(f => f.original_path !== file.original_path));
      addToast({
        type: 'success',
        title: 'Skipped',
        message: 'Marked as keep original',
        duration: 3000,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to skip',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setApplying(prev => {
        const next = new Set(prev);
        next.delete(file.original_path);
        return next;
      });
    }
  };

  const handleApplyAll = async () => {
    if (files.length === 0) return;

    const allPaths = files.map(f => f.original_path);
    setApplying(new Set(allPaths));

    try {
      const changes = files.map(f => ({
        filePath: f.original_path,
        suggestedName: f.suggested_name,
      }));
      await applyChanges(changes);
      await clearAppliedFiles(allPaths);
      setFiles([]);
      addToast({
        type: 'success',
        title: 'All Applied',
        message: `Renamed ${changes.length} files`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to apply all',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      // Reload to get current state
      loadFiles();
    } finally {
      setApplying(new Set());
    }
  };

  const handleApplyDirectory = async (dir: string) => {
    const dirFiles = groupedFiles[dir];
    if (!dirFiles || dirFiles.length === 0) return;

    const dirPaths = dirFiles.map(f => f.original_path);
    setApplying(prev => new Set([...prev, ...dirPaths]));

    try {
      const changes = dirFiles.map(f => ({
        filePath: f.original_path,
        suggestedName: f.suggested_name,
      }));
      await applyChanges(changes);
      await clearAppliedFiles(dirPaths);
      setFiles(prev => prev.filter(f => !dirPaths.includes(f.original_path)));
      addToast({
        type: 'success',
        title: 'Applied',
        message: `Renamed ${changes.length} files in ${dir.split('/').pop()}`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to apply',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setApplying(prev => {
        const next = new Set(prev);
        dirPaths.forEach(p => next.delete(p));
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Pending Approval
                  </h1>
                  <p className="text-sm text-zinc-500">
                    {files.length} file{files.length !== 1 ? 's' : ''} across {Object.keys(groupedFiles).length} folder{Object.keys(groupedFiles).length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadFiles} disabled={loading}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
              <Button
                size="sm"
                onClick={handleApplyAll}
                disabled={files.length === 0 || applying.size > 0}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Approve All ({files.length})
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              No files ready to apply
            </h2>
            <p className="text-zinc-500 mb-6">
              Generate names for files to see them here
            </p>
            <Link href="/">
              <Button>Go to File Browser</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFiles).map(([dir, dirFiles]) => (
              <motion.div
                key={dir}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                {/* Directory Header */}
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-md" title={dir}>
                      {dir}
                    </span>
                    <span className="text-xs text-zinc-500">({dirFiles.length})</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleApplyDirectory(dir)}
                    disabled={applying.size > 0}
                    className="gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Approve All
                  </Button>
                </div>

                {/* Files */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {dirFiles.map((file) => {
                    const isApplying = applying.has(file.original_path);
                    const isRegen = regenerating.has(file.original_path);
                    const isImage = isImageFile(file.original_name);
                    const isEditing = editingPath === file.original_path;

                    return (
                      <div
                        key={file.id}
                        className={cn(
                          'px-4 py-3 flex items-center gap-4 transition-colors',
                          (isApplying || isRegen) && 'bg-zinc-50 dark:bg-zinc-800/30'
                        )}
                        onMouseEnter={(e) => handleMouseEnter(e, file)}
                        onMouseLeave={handleMouseLeave}
                      >
                        {/* Thumbnail */}
                        <div
                          className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => handlePreview(file)}
                        >
                          {isImage ? (
                            <img
                              src={`${API_BASE}/api/file/preview?path=${encodeURIComponent(file.original_path)}`}
                              alt={file.original_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <ImageIcon className={cn('w-6 h-6 text-zinc-400', isImage && 'hidden')} />
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate" title={file.original_name}>
                            {file.original_name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                            {isEditing ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(file);
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  className="px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded text-green-600 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(file)}
                                  className="p-1 text-green-500 hover:text-green-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1 text-red-500 hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-medium text-green-600 dark:text-green-400 truncate" title={file.suggested_name}>
                                  {file.suggested_name}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <Tooltip content="Edit name">
                                    <button
                                      onClick={() => handleStartEdit(file)}
                                      disabled={isApplying || isRegen}
                                      className="p-1 text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip content="Regenerate Name">
                                    <button
                                      onClick={() => handleRegenerate(file)}
                                      disabled={isApplying || isRegen}
                                      className={cn(
                                        'p-1 rounded transition-colors',
                                        isRegen
                                          ? 'text-yellow-500 cursor-wait'
                                          : 'text-zinc-400 hover:text-yellow-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50'
                                      )}
                                    >
                                      {isRegen ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </Tooltip>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Tooltip content="Preview">
                            <button
                              onClick={() => handlePreview(file)}
                              className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSkipSingle(file)}
                            disabled={isApplying || isRegen}
                            className="text-zinc-500 hover:text-orange-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApplySingle(file)}
                            disabled={isApplying || isRegen}
                            className="gap-1"
                          >
                            {isApplying ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Hover Preview */}
      <AnimatePresence>
        {hoverPreview && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: Math.max(10, hoverPreview.x),
              top: Math.min(hoverPreview.y, typeof window !== 'undefined' ? window.innerHeight - 220 : 600),
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-48 h-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              <img
                src={`${API_BASE}/api/file/preview?path=${encodeURIComponent(hoverPreview.path)}`}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={previewFile !== null}
        onClose={handlePreviewClose}
        onNext={handlePreviewNext}
        onPrev={handlePreviewPrev}
        hasNext={hasPreviewNext}
        hasPrev={hasPreviewPrev}
        processingInfo={previewProcessingInfo || undefined}
      />
    </div>
  );
}
