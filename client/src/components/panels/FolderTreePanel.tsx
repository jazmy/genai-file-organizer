'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderTree,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  File,
  Image,
  FileText,
  Music,
  Video,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { API_BASE } from '@/lib/api/client';

interface FolderStats {
  path: string;
  name: string;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  children: FolderStats[];
  isExpanded: boolean;
}

interface FolderTreePanelProps {
  onClose: () => void;
  onNavigate: (path: string) => void;
  className?: string;
}

export function FolderTreePanel({ onClose, onNavigate, className }: FolderTreePanelProps) {
  const [, setRootPath] = useState<string>('/');
  const [treeData, setTreeData] = useState<FolderStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const loadFolderStats = useCallback(async (path: string): Promise<FolderStats | null> => {
    try {
      const response = await fetch(
        `${API_BASE}/api/files?path=${encodeURIComponent(path)}`
      );
      const data = await response.json();

      if (!data.items) return null;

      const files = data.items.filter((item: { isDirectory: boolean }) => !item.isDirectory);
      const folders = data.items.filter((item: { isDirectory: boolean }) => item.isDirectory);

      // Calculate file type distribution
      const fileTypes: Record<string, number> = {};
      files.forEach((file: { name: string }) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      });

      // Calculate total size
      const totalSize = files.reduce(
        (sum: number, file: { sizeKB: number }) => sum + (file.sizeKB || 0),
        0
      );

      return {
        path,
        name: path.split('/').pop() || 'Root',
        totalFiles: files.length,
        totalFolders: folders.length,
        totalSize,
        fileTypes,
        children: folders.map((folder: { path: string; name: string }) => ({
          path: folder.path,
          name: folder.name,
          totalFiles: 0,
          totalFolders: 0,
          totalSize: 0,
          fileTypes: {},
          children: [],
          isExpanded: false,
        })),
        isExpanded: true,
      };
    } catch {
      return null;
    }
  }, []);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Get config to find default path
      const configResponse = await fetch(`${API_BASE}/api/config`);
      const config = await configResponse.json();
      const defaultPath = config.ui?.defaultPath || '/';
      setRootPath(defaultPath);

      const stats = await loadFolderStats(defaultPath);
      if (stats) {
        setTreeData(stats);
        setExpandedPaths(new Set([defaultPath]));
      } else {
        setError('Failed to load folder structure');
      }
    } catch (err) {
      setError('Failed to load folder structure');
    } finally {
      setLoading(false);
    }
  }, [loadFolderStats]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const toggleExpand = async (path: string) => {
    const newExpanded = new Set(expandedPaths);

    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      setExpandedPaths(newExpanded);
    } else {
      newExpanded.add(path);
      setExpandedPaths(newExpanded);

      // Load children if not loaded
      const updateTreeData = async (node: FolderStats): Promise<FolderStats> => {
        if (node.path === path && node.children.length > 0) {
          // Load stats for children that haven't been loaded
          const updatedChildren = await Promise.all(
            node.children.map(async (child) => {
              if (child.totalFiles === 0 && child.totalFolders === 0) {
                const stats = await loadFolderStats(child.path);
                return stats || child;
              }
              return child;
            })
          );
          return { ...node, children: updatedChildren };
        }
        if (node.children.length > 0) {
          const updatedChildren = await Promise.all(node.children.map(updateTreeData));
          return { ...node, children: updatedChildren };
        }
        return node;
      };

      if (treeData) {
        const updated = await updateTreeData(treeData);
        setTreeData(updated);
      }
    }
  };

  const formatSize = (sizeKB: number): string => {
    if (sizeKB < 1024) return `${sizeKB.toFixed(1)} KB`;
    return `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  const getFileTypeIcon = (ext: string) => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'md'];

    if (imageExts.includes(ext)) return Image;
    if (videoExts.includes(ext)) return Video;
    if (audioExts.includes(ext)) return Music;
    if (docExts.includes(ext)) return FileText;
    return File;
  };

  const renderNode = (node: FolderStats, depth: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children.length > 0;
    const FolderIcon = isExpanded ? FolderOpen : Folder;

    return (
      <div key={node.path}>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors',
            depth === 0 && 'bg-zinc-50 dark:bg-zinc-800/50'
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onNavigate(node.path)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.path);
              }}
              className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <FolderIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />

          <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate flex-1">
            {node.name}
          </span>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {node.totalFiles > 0 && (
              <span className="flex items-center gap-1">
                <File className="w-3 h-3" />
                {node.totalFiles}
              </span>
            )}
            {node.totalFolders > 0 && (
              <span className="flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {node.totalFolders}
              </span>
            )}
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* File type summary */}
              {Object.keys(node.fileTypes).length > 0 && (
                <div
                  className="flex flex-wrap gap-1 py-1 text-xs"
                  style={{ paddingLeft: `${28 + depth * 16}px` }}
                >
                  {Object.entries(node.fileTypes)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([ext, count]) => {
                      const Icon = getFileTypeIcon(ext);
                      return (
                        <span
                          key={ext}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400"
                        >
                          <Icon className="w-3 h-3" />
                          {ext}: {count}
                        </span>
                      );
                    })}
                  {node.totalSize > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                      {formatSize(node.totalSize)}
                    </span>
                  )}
                </div>
              )}

              {/* Children */}
              {node.children.map((child) => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={cn(
        'bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full overflow-y-auto',
        className
      )}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-yellow-500" />
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Folder Structure</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTree}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {loading && !treeData && (
          <div className="text-center py-8 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading folder structure...
          </div>
        )}

        {treeData && (
          <div className="space-y-1">
            {renderNode(treeData)}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 space-y-1">
            <div className="flex items-center gap-2">
              <File className="w-3 h-3" />
              <span>Click folder to navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3" />
              <span>Click arrow to expand/collapse</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
