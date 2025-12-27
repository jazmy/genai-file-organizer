'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  File,
  AlertCircle,
  ExternalLink,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { API_BASE } from '@/lib/api/client';
import type { FileItem } from '@/types/files';

export interface ProcessingInfo {
  suggestedName?: string;
  aiSuggestedName?: string;
  category?: string;
  error?: string;
}

interface FilePreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  processingInfo?: ProcessingInfo;
}

// File type categories for preview support
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
const documentExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv'];
const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.html', '.css'];
const designExtensions = ['.psd', '.ai', '.xd', '.sketch'];

function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(lastDot).toLowerCase() : '';
}

function getFileCategory(name: string): 'image' | 'document' | 'video' | 'audio' | 'code' | 'design' | 'archive' | 'other' {
  const ext = getFileExtension(name);
  if (imageExtensions.includes(ext)) return 'image';
  if (documentExtensions.includes(ext)) return 'document';
  if (videoExtensions.includes(ext)) return 'video';
  if (['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'].includes(ext)) return 'audio';
  if (codeExtensions.includes(ext)) return 'code';
  if (designExtensions.includes(ext)) return 'design';
  if (['.zip', '.tar', '.gz', '.rar', '.7z', '.dmg'].includes(ext)) return 'archive';
  return 'other';
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'image': return ImageIcon;
    case 'document': return FileText;
    case 'video': return Video;
    case 'audio': return Music;
    case 'code': return Code;
    case 'archive': return Archive;
    default: return File;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  processingInfo,
}: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const category = file ? getFileCategory(file.name) : 'other';
  const CategoryIcon = getCategoryIcon(category);

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      setZoom(1);
      setLoading(true);
      setError(false);
    }
  }, [file?.path]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          if (hasNext && onNext) onNext();
          break;
        case 'ArrowLeft':
          if (hasPrev && onPrev) onPrev();
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.25, 3));
          break;
        case '-':
          setZoom(z => Math.max(z - 0.25, 0.5));
          break;
        case '0':
          setZoom(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNext, onPrev, onClose]);

  const handleDownload = useCallback(() => {
    if (!file) return;
    const link = document.createElement('a');
    link.href = `${API_BASE}/api/file/preview?path=${encodeURIComponent(file.path)}`;
    link.download = file.name;
    link.click();
  }, [file]);

  const previewUrl = file
    ? `${API_BASE}/api/file/preview?path=${encodeURIComponent(file.path)}`
    : '';

  const canPreview = category === 'image' || category === 'document' || category === 'video' || category === 'design';

  return (
    <AnimatePresence>
      {isOpen && file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-lg transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation arrows */}
          {hasPrev && onPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {hasNext && onNext && (
            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Main preview area */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col bg-zinc-900 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
              <div className="flex items-center gap-3">
                <CategoryIcon className="w-5 h-5 text-zinc-400" />
                <span className="font-medium text-white truncate max-w-[400px]">
                  {file.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canPreview && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                      className="text-zinc-400 hover:text-white"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-zinc-400 w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                      className="text-zinc-400 hover:text-white"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoom(1)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-zinc-400 hover:text-white"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[400px]">
              {loading && canPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error ? (
                <div className="flex flex-col items-center justify-center text-zinc-500">
                  <CategoryIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">Preview not available</p>
                  <p className="text-sm mt-1">This file type cannot be previewed</p>
                </div>
              ) : canPreview ? (
                category === 'video' ? (
                  <video
                    src={previewUrl}
                    controls
                    className="max-w-full max-h-[70vh]"
                    onLoadedData={() => setLoading(false)}
                    onError={() => { setLoading(false); setError(true); }}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    style={{ transform: `scale(${zoom})` }}
                    className={cn(
                      "max-w-full max-h-[70vh] object-contain transition-transform duration-200",
                      loading && "opacity-0"
                    )}
                    onLoad={() => setLoading(false)}
                    onError={() => { setLoading(false); setError(true); }}
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500">
                  <CategoryIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">Preview not available</p>
                  <p className="text-sm mt-1">This file type cannot be previewed</p>
                </div>
              )}
            </div>

            {/* Footer with file info and processing details */}
            <div className="px-4 py-3 bg-zinc-800 border-t border-zinc-700 text-sm space-y-2">
              {/* Processing info section */}
              {processingInfo && (
                <div className="space-y-2 pb-2 border-b border-zinc-700">
                  {/* Suggested name */}
                  {processingInfo.suggestedName && (
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-500 shrink-0">Generated name:</span>
                      <span className="text-green-400 font-mono text-xs break-all">
                        {processingInfo.suggestedName}
                      </span>
                    </div>
                  )}

                  {/* Category */}
                  {processingInfo.category && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-zinc-500" />
                      <span className="text-zinc-500">Category:</span>
                      <span className="text-blue-400 capitalize">{processingInfo.category}</span>
                    </div>
                  )}

                  {/* Error */}
                  {processingInfo.error && (
                    <div className="flex items-start gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="text-xs break-all">{processingInfo.error}</span>
                    </div>
                  )}

                  {/* Link to logs */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/logs?tab=ai&search=${encodeURIComponent(file.name)}&openFile=${encodeURIComponent(file.name)}`}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View detailed AI logs
                    </Link>
                  </div>
                </div>
              )}

              {/* File info row */}
              <div className="flex items-center justify-between text-zinc-400">
                <div className="flex items-center gap-4">
                  <span>Size: {formatFileSize(file.size)}</span>
                  {file.modified && (
                    <span>Modified: {new Date(file.modified).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase px-2 py-0.5 bg-zinc-700 rounded">
                    {getFileExtension(file.name).slice(1) || 'file'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
            <span className="px-2">Esc to close</span>
            {(hasPrev || hasNext) && <span className="px-2">Arrow keys to navigate</span>}
            {canPreview && <span className="px-2">+/- to zoom</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FilePreviewModal;
