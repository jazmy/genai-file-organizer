'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileRow } from './FileRow';
import { FileRowSkeleton } from '@/components/ui/Skeleton';
import { API_BASE } from '@/lib/api/client';
import type { FileItem, ProcessResult } from '@/types/files';

interface FileListProps {
  files: FileItem[];
  results: Map<string, ProcessResult>;
  selectedFiles: Set<string>;
  completedFiles: Set<string>;
  regeneratingFiles: Set<string>;
  loading?: boolean;
  onSelect: (path: string, selected: boolean) => void;
  onNavigate: (path: string) => void;
  onRegenerate: (path: string) => void;
  onApply: (path: string, suggestedName: string) => void;
  onKeepOriginal: (path: string) => void;
  onEdit: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  onDirectRename?: (filePath: string, newName: string) => void;
  onPreview?: (file: FileItem) => void;
}

export function FileList({
  files,
  results,
  selectedFiles,
  completedFiles,
  regeneratingFiles,
  loading,
  onSelect,
  onNavigate,
  onRegenerate,
  onApply,
  onKeepOriginal,
  onEdit,
  onDelete,
  onDirectRename,
  onPreview,
}: FileListProps) {
  const [hoverPreview, setHoverPreview] = useState<{
    path: string;
    x: number;
    y: number;
  } | null>(null);

  const isImageFile = (fileName: string) => {
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.svg', '.bmp', '.tiff'].some(
      (ext) => fileName.toLowerCase().endsWith(ext)
    );
  };

  const handleMouseEnter = (e: React.MouseEvent, file: FileItem) => {
    if (!file.isDirectory && isImageFile(file.name)) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoverPreview({
        path: file.path,
        x: rect.left - 210,
        y: rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverPreview(null);
  };

  if (loading) {
    return (
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {Array.from({ length: 10 }).map((_, i) => (
          <FileRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <p className="text-lg">No files found</p>
        <p className="text-sm mt-1">This folder is empty</p>
      </div>
    );
  }

  return (
    <>
      <motion.div layout className="divide-y divide-zinc-200 dark:divide-zinc-800">
        <AnimatePresence mode="popLayout">
          {files.map((file, index) => {
            const result = results.get(file.path);
            return (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.01 }}
              >
                <FileRow
                  file={file}
                  result={result}
                  isSelected={selectedFiles.has(file.path)}
                  isCompleted={completedFiles.has(file.path)}
                  isRegenerating={regeneratingFiles.has(file.path)}
                  onSelect={(selected) => onSelect(file.path, selected)}
                  onNavigate={() => onNavigate(file.path)}
                  onRegenerate={() => onRegenerate(file.path)}
                  onApply={onApply}
                  onKeepOriginal={() => onKeepOriginal(file.path)}
                  onEdit={(newName) => onEdit(file.path, newName)}
                  onDelete={() => onDelete(file.path)}
                  onDirectRename={onDirectRename}
                  onHover={(e) => handleMouseEnter(e, file)}
                  onLeave={handleMouseLeave}
                  onPreview={() => onPreview?.(file)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Hover Preview */}
      <AnimatePresence>
        {hoverPreview && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: Math.max(10, hoverPreview.x),
              top: Math.min(hoverPreview.y, window.innerHeight - 220),
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
    </>
  );
}
