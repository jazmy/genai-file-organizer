'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Home,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  Eye,
  CheckCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  FolderPlus,
} from 'lucide-react';
import { getConfig, saveConfig } from '@/lib/api/config';
import { cn } from '@/lib/utils/cn';
import { useFileStore } from '@/stores/fileStore';
import { useProcessingStore } from '@/stores/processingStore';
import { Button } from '@/components/ui/Button';
import type { SortField, SortDirection } from '@/types/files';

interface HeaderProps {
  onPreviewAll: () => void;
  onApplyAll: () => void;
  onKeepOriginalSelected: () => void;
  onDeleteSelected: () => void;
}

export function Header({ onPreviewAll, onApplyAll, onKeepOriginalSelected, onDeleteSelected }: HeaderProps) {
  const { currentPath, viewMode, setViewMode, sortConfig, setSortConfig, selectedFiles, results, loadFiles } =
    useFileStore();
  const { isProcessing, isApplying } = useProcessingStore();
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [addingShortcut, setAddingShortcut] = useState(false);

  const pathParts = currentPath.split('/').filter(Boolean);

  const handleBreadcrumbClick = async (index: number) => {
    const newPath = '/' + pathParts.slice(0, index + 1).join('/');
    await loadFiles(newPath);
  };

  const handleSort = (field: SortField) => {
    const direction: SortDirection =
      sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, direction });
    setShowSortMenu(false);
  };

  const handleCreateShortcut = async () => {
    if (currentPath === '/' || addingShortcut) return;
    setAddingShortcut(true);
    try {
      const config = await getConfig();
      const folderName = pathParts[pathParts.length - 1] || 'Shortcut';
      const existingShortcuts = config.ui?.folderShortcuts || [];
      
      // Check if shortcut already exists
      if (existingShortcuts.some(s => s.path === currentPath)) {
        setAddingShortcut(false);
        return;
      }
      
      await saveConfig({
        ...config,
        ui: {
          ...config.ui,
          folderShortcuts: [...existingShortcuts, { name: folderName, path: currentPath }],
        },
      });
      
      // Notify sidebar to reload
      window.dispatchEvent(new Event('config-updated'));
    } catch (err) {
      console.error('Failed to create shortcut:', err);
    } finally {
      setAddingShortcut(false);
    }
  };

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'size', label: 'Size' },
    { field: 'modified', label: 'Date Modified' },
    { field: 'type', label: 'Type' },
  ];

  // Count only selected files that are ready to apply
  const selectedReadyToApplyCount = Array.from(selectedFiles).filter(
    (path) => results.has(path) && results.get(path)?.success
  ).length;

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      {/* Top Bar - Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 dark:border-zinc-800">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm overflow-x-auto">
          <button
            onClick={() => loadFiles('/')}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4 text-zinc-500" />
          </button>

          {pathParts.map((part, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <ChevronRight className="w-4 h-4 text-zinc-400 mx-1" />
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={cn(
                  'px-2 py-1 rounded-lg transition-colors truncate max-w-[200px]',
                  index === pathParts.length - 1
                    ? 'font-medium text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                {part}
              </button>
            </motion.div>
          ))}

          {/* Create Shortcut Button */}
          {currentPath !== '/' && (
            <button
              onClick={handleCreateShortcut}
              disabled={addingShortcut}
              className="ml-2 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              title="Add to shortcuts"
            >
              <FolderPlus className={cn('w-4 h-4', addingShortcut && 'animate-pulse')} />
            </button>
          )}
        </nav>

        {/* View Controls */}
        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </Button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[150px]"
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.field}
                      onClick={() => handleSort(option.field)}
                      className={cn(
                        'w-full px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between',
                        sortConfig.field === option.field && 'text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {option.label}
                      {sortConfig.field === option.field && (
                        <span className="text-xs">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-all duration-200',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-all duration-200',
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Actions */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-50 dark:bg-zinc-900/50">
        {/* Selection Info */}
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium">
            {selectedFiles.size > 0 ? (
              <span className="text-blue-600 dark:text-blue-400">{selectedFiles.size} selected</span>
            ) : (
              'No files selected'
            )}
          </span>
          {selectedReadyToApplyCount > 0 && selectedReadyToApplyCount !== selectedFiles.size && (
            <span className="text-zinc-400 dark:text-zinc-500">
              ({selectedReadyToApplyCount} pending approval)
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Delete Selected */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
            onClick={onDeleteSelected}
            disabled={selectedFiles.size === 0 || isProcessing}
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedFiles.size > 0 && `(${selectedFiles.size})`}
          </Button>

          {/* Skip / Revert to Original */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onKeepOriginalSelected}
            disabled={selectedFiles.size === 0 || isProcessing}
          >
            <CheckCircle2 className="w-4 h-4" />
            {selectedReadyToApplyCount > 0 ? 'Revert to Original' : 'Skip'}
            {selectedFiles.size > 0 && ` (${selectedFiles.size})`}
          </Button>

          {/* Generate Names */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onPreviewAll}
            disabled={selectedFiles.size === 0 || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Generate Name
            {selectedFiles.size > 0 && ` (${selectedFiles.size})`}
          </Button>

          {/* Approve Name - can work while processing since it only affects ready files */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 border-green-600 text-white"
            onClick={onApplyAll}
            disabled={selectedReadyToApplyCount === 0 || isApplying}
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isApplying ? 'Approving...' : `Approve Name${selectedReadyToApplyCount > 1 ? 's' : ''} ${selectedReadyToApplyCount > 0 ? `(${selectedReadyToApplyCount})` : ''}`}
          </Button>
        </div>
      </div>
    </header>
  );
}
