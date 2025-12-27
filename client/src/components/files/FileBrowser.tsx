'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search, X, FolderOutput, ExternalLink } from 'lucide-react';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FilePreviewModal, type ProcessingInfo } from '@/components/modals/FilePreviewModal';
import { RegenerateModal } from '@/components/modals/RegenerateModal';
import { cn } from '@/lib/utils/cn';

type FilterType = 'all' | 'processing' | 'unprocessed' | 'ready' | 'completed';
import { useFileStore } from '@/stores/fileStore';
import { useProcessingStore } from '@/stores/processingStore';
import { sortFiles, groupFilesByStatus } from '@/lib/utils/fileHelpers';
import type { FileItem } from '@/types/files';

interface FileBrowserProps {
  onRegenerate: (path: string, feedback?: string) => void;
  onApply: (path: string, suggestedName: string) => void;
  onKeepOriginal: (path: string) => void;
  onEdit: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  onDirectRename?: (filePath: string, newName: string) => void;
}

export function FileBrowser({
  onRegenerate,
  onApply,
  onKeepOriginal,
  onEdit,
  onDelete,
  onDirectRename,
}: FileBrowserProps) {
  const {
    files,
    results,
    selectedFiles,
    completedFiles,
    movedFiles,
    loading,
    viewMode,
    sortConfig,
    selectFile,
    selectAll,
    selectUnprocessed,
    loadFiles,
  } = useFileStore();

  const { regeneratingFiles, queue } = useProcessingStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Regenerate modal state
  const [regenerateModalFile, setRegenerateModalFile] = useState<FileItem | null>(null);
  const [isRegenerateModalLoading, setIsRegenerateModalLoading] = useState(false);

  // Compute which files are truly "processing":
  // - regeneratingFiles: always show as processing (actively waiting for new AI result)
  // - queue: only show as processing if they DON'T have results yet
  // Files in queue that already have results should show as "Pending Approval"
  const processingFiles = useMemo(() => {
    const combined = new Set(regeneratingFiles);
    // Only add queue files that don't already have results
    queue.forEach(path => {
      if (!results.has(path)) {
        combined.add(path);
      }
    });
    return combined;
  }, [regeneratingFiles, queue, results]);

  // Sort and filter files by search query
  const sortedFiles = useMemo(() => {
    let filtered = files;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = files.filter(f => f.name.toLowerCase().includes(query));
    }
    return sortFiles(filtered, sortConfig);
  }, [files, sortConfig, searchQuery]);

  const { directories, processing, readyToApply, failed, completed, unprocessed } = useMemo(
    () => groupFilesByStatus(sortedFiles, results, completedFiles, processingFiles),
    [sortedFiles, results, completedFiles, processingFiles]
  );

  const supportedFiles = files.filter((f) => !f.isDirectory && f.isSupported);
  const allSelected = supportedFiles.length > 0 && supportedFiles.every((f) => selectedFiles.has(f.path));

  const handleNavigate = async (path: string) => {
    await loadFiles(path);
  };

  // Get all previewable files (non-directories) in sorted order
  const previewableFiles = useMemo(() => {
    return sortedFiles.filter(f => !f.isDirectory && f.isSupported);
  }, [sortedFiles]);

  const handlePreview = useCallback((file: FileItem) => {
    if (!file.isDirectory) {
      setPreviewFile(file);
    }
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewFile(null);
  }, []);

  const handlePreviewNext = useCallback(() => {
    if (!previewFile) return;
    const currentIndex = previewableFiles.findIndex(f => f.path === previewFile.path);
    if (currentIndex < previewableFiles.length - 1) {
      setPreviewFile(previewableFiles[currentIndex + 1]);
    }
  }, [previewFile, previewableFiles]);

  const handlePreviewPrev = useCallback(() => {
    if (!previewFile) return;
    const currentIndex = previewableFiles.findIndex(f => f.path === previewFile.path);
    if (currentIndex > 0) {
      setPreviewFile(previewableFiles[currentIndex - 1]);
    }
  }, [previewFile, previewableFiles]);

  // Get processing info for the current preview file
  const previewProcessingInfo = useMemo((): ProcessingInfo | undefined => {
    if (!previewFile) return undefined;
    const result = results.get(previewFile.path);
    if (!result) return undefined;
    return {
      suggestedName: result.suggestedName,
      aiSuggestedName: result.aiSuggestedName,
      category: result.category,
      error: result.error,
    };
  }, [previewFile, results]);

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

  // Regenerate modal handlers
  const handleOpenRegenerateModal = useCallback((file: FileItem) => {
    // Only show modal if there's already a result to show as "rejected"
    const result = results.get(file.path);
    if (result?.success && result.suggestedName) {
      setRegenerateModalFile(file);
    } else {
      // No existing result, just regenerate directly
      onRegenerate(file.path);
    }
  }, [results, onRegenerate]);

  const handleCloseRegenerateModal = useCallback(() => {
    if (!isRegenerateModalLoading) {
      setRegenerateModalFile(null);
    }
  }, [isRegenerateModalLoading]);

  const handleRegenerateWithFeedback = useCallback((feedback: string) => {
    if (!regenerateModalFile || isRegenerateModalLoading) return;

    const filePath = regenerateModalFile.path;

    // Show loading state briefly, then close modal
    setIsRegenerateModalLoading(true);

    // Start regeneration
    onRegenerate(filePath, feedback);

    // Close modal after a brief delay to show the loading state
    setTimeout(() => {
      setIsRegenerateModalLoading(false);
      setRegenerateModalFile(null);
    }, 500);
  }, [regenerateModalFile, onRegenerate, isRegenerateModalLoading]);

  const FileComponent = viewMode === 'grid' ? FileGrid : FileList;

  const getEmptyMessage = (title: string) => {
    switch (title) {
      case 'Processing':
        return 'No files currently processing.';
      case 'Pending Approval':
        return 'No files pending approval. Generate names for files to see them here.';
      case 'Failed':
        return 'No failed files. Files that fail to process will appear here.';
      default:
        return 'No files in this category.';
    }
  };

  const renderSection = (
    title: string,
    sectionFiles: FileItem[],
    showSelectAll?: boolean,
    selectAllHandler?: () => void,
    showWhenEmpty?: boolean
  ) => {
    if (sectionFiles.length === 0 && !showWhenEmpty) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {title} ({sectionFiles.length})
          </span>
          {showSelectAll && selectAllHandler && sectionFiles.length > 0 && (
            <Button variant="ghost" size="sm" onClick={selectAllHandler}>
              {sectionFiles.every((f) => selectedFiles.has(f.path))
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          )}
        </div>
        {sectionFiles.length > 0 ? (
          <FileComponent
            files={sectionFiles}
            results={results}
            selectedFiles={selectedFiles}
            completedFiles={completedFiles}
            regeneratingFiles={processingFiles}
            onSelect={selectFile}
            onNavigate={handleNavigate}
            onRegenerate={(path: string) => {
              const file = sectionFiles.find(f => f.path === path);
              if (file) {
                handleOpenRegenerateModal(file);
              } else {
                onRegenerate(path);
              }
            }}
            onApply={onApply}
            onKeepOriginal={onKeepOriginal}
            onEdit={onEdit}
            onDelete={onDelete}
            onDirectRename={onDirectRename}
            onPreview={handlePreview}
          />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            {getEmptyMessage(title)}
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <FileComponent
            files={[]}
            results={new Map()}
            selectedFiles={new Set()}
            completedFiles={new Set()}
            regeneratingFiles={new Set()}
            loading={true}
            onSelect={() => {}}
            onNavigate={() => {}}
            onRegenerate={() => {}}
            onApply={() => {}}
            onKeepOriginal={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header with select all and filter */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onChange={(e) => selectAll(e.target.checked)}
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {selectedFiles.size} selected
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="pl-9 pr-8 w-48 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Filter Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="w-4 h-4" />
                {filter === 'all' ? 'All' : filter === 'processing' ? 'Processing' : filter === 'unprocessed' ? 'Unprocessed' : filter === 'ready' ? 'Pending Approval' : 'Completed'}
              </Button>

              {showFilterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[150px]"
                  >
                    {[
                      { value: 'all' as FilterType, label: 'All' },
                      { value: 'processing' as FilterType, label: 'Processing' },
                      { value: 'ready' as FilterType, label: 'Pending Approval' },
                      { value: 'unprocessed' as FilterType, label: 'Unprocessed' },
                      { value: 'completed' as FilterType, label: 'Completed' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilter(option.value);
                          setShowFilterMenu(false);
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700',
                          filter === option.value && 'text-blue-600 dark:text-blue-400 font-medium'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </div>
            <span className="text-sm text-zinc-500">
              {searchQuery ? `${sortedFiles.length} of ${files.length}` : files.length} items
            </span>
          </div>
        </div>
      </div>

      {/* Directories */}
      {directories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Folders ({directories.length})
            </span>
          </div>
          <FileComponent
            files={directories}
            results={results}
            selectedFiles={selectedFiles}
            completedFiles={completedFiles}
            regeneratingFiles={processingFiles}
            onSelect={selectFile}
            onNavigate={handleNavigate}
            onRegenerate={onRegenerate}
            onApply={onApply}
            onKeepOriginal={onKeepOriginal}
            onEdit={onEdit}
            onDelete={onDelete}
            onDirectRename={onDirectRename}
            onPreview={handlePreview}
          />
        </motion.div>
      )}

      {/* Processing - files currently being processed by GenAI */}
      {(filter === 'all' || filter === 'processing') && renderSection(
        'Processing',
        processing,
        false,
        undefined,
        filter === 'all' // showWhenEmpty only when filter is 'all'
      )}

      {/* Pending Approval - files with generated names ready to be approved */}
      {(filter === 'all' || filter === 'ready') && renderSection(
        'Pending Approval',
        readyToApply,
        true,
        () => {
          const allReady = readyToApply.every((f) => selectedFiles.has(f.path));
          readyToApply.forEach((f) => selectFile(f.path, !allReady));
        },
        filter === 'all' // showWhenEmpty only when filter is 'all'
      )}

      {/* Failed - files that failed to process */}
      {(filter === 'all') && failed.length > 0 && renderSection(
        'Failed',
        failed,
        true,
        () => {
          const allFailed = failed.every((f) => selectedFiles.has(f.path));
          failed.forEach((f) => selectFile(f.path, !allFailed));
        }
      )}

      {/* Unprocessed */}
      {(filter === 'all' || filter === 'unprocessed') && renderSection(
        'Unprocessed',
        unprocessed,
        true,
        () => selectUnprocessed(!unprocessed.every((f) => selectedFiles.has(f.path)))
      )}

      {/* Completed - at bottom */}
      {(filter === 'all' || filter === 'completed') && renderSection('Completed', completed)}

      {/* Recently Moved - files that were processed and moved to other folders */}
      {(filter === 'all') && movedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 flex items-center gap-2">
            <FolderOutput className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Recently Moved ({movedFiles.length})
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
              Files organized to category folders
            </span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {movedFiles.slice(0, 20).map((moved) => {
              const destFolder = moved.newPath.substring(0, moved.newPath.lastIndexOf('/'));
              const destFolderName = destFolder.split('/').slice(-2).join('/');
              return (
                <div
                  key={moved.originalPath}
                  className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500 line-through truncate max-w-[200px]">
                        {moved.originalName}
                      </span>
                      <span className="text-zinc-400">→</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {moved.newName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        {moved.category}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <FolderOutput className="w-3 h-3" />
                        {destFolderName}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-zinc-500 hover:text-zinc-700"
                    onClick={() => {
                      // Navigate to the destination folder
                      loadFiles(destFolder);
                    }}
                    title="Go to destination folder"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            {movedFiles.length > 20 && (
              <div className="px-4 py-2 text-center text-xs text-zinc-500">
                Showing 20 of {movedFiles.length} moved files
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {files.length === 0 && !loading && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-lg text-zinc-600 dark:text-zinc-400">No files found</p>
          <p className="text-sm text-zinc-500 mt-1">This folder is empty</p>
        </div>
      )}

      {/* No search results */}
      {files.length > 0 && sortedFiles.length === 0 && searchQuery && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <Search className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <p className="text-lg text-zinc-600 dark:text-zinc-400">No matching files</p>
          <p className="text-sm text-zinc-500 mt-1">
            No files match &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => setSearchQuery('')}
          >
            Clear search
          </Button>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={previewFile !== null}
        onClose={handlePreviewClose}
        onNext={handlePreviewNext}
        onPrev={handlePreviewPrev}
        hasNext={hasPreviewNext}
        hasPrev={hasPreviewPrev}
        processingInfo={previewProcessingInfo}
      />

      {/* Regenerate Modal */}
      <RegenerateModal
        isOpen={regenerateModalFile !== null}
        onClose={handleCloseRegenerateModal}
        onRegenerate={handleRegenerateWithFeedback}
        originalName={regenerateModalFile?.name || ''}
        suggestedName={regenerateModalFile ? (results.get(regenerateModalFile.path)?.suggestedName || '') : ''}
        isLoading={isRegenerateModalLoading}
      />
    </div>
  );
}
