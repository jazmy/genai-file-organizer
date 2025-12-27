'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  RefreshCw,
  CheckCircle,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getFileIcon, isImageFile } from '@/lib/utils/fileHelpers';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tooltip } from '@/components/ui/Tooltip';
import { API_BASE } from '@/lib/api/client';
import type { FileItem, ProcessResult } from '@/types/files';

interface FileCardProps {
  file: FileItem;
  result?: ProcessResult;
  isSelected: boolean;
  isCompleted: boolean;
  isRegenerating: boolean;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onRegenerate: () => void;
  onApply: () => void;
  onKeepOriginal: () => void;
  onEdit: (newName: string) => void;
  onDelete: () => void;
  onDirectRename?: (filePath: string, newName: string) => void;
  onPreview?: () => void;
}

export function FileCard({
  file,
  result,
  isSelected,
  isCompleted,
  isRegenerating,
  onSelect,
  onNavigate,
  onRegenerate,
  onApply,
  onKeepOriginal,
  onEdit,
  onDelete,
  onDirectRename,
  onPreview,
}: FileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [imageError, setImageError] = useState(false);

  const Icon = getFileIcon(file);
  const isImage = isImageFile(file.name);

  const handleStartEdit = () => {
    if (result?.suggestedName) {
      setEditValue(result.suggestedName);
      setIsEditing(true);
    }
  };

  const handleStartDirectEdit = () => {
    setEditValue(file.name);
    setIsEditing(true);
  };

  const handleSaveDirectEdit = () => {
    if (editValue.trim() && editValue.trim() !== file.name && onDirectRename) {
      onDirectRename(file.path, editValue.trim());
    }
    setIsEditing(false);
    setEditValue('');
  };

  const handleSaveEdit = () => {
    if (editValue.trim()) {
      onEdit(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group bg-white dark:bg-zinc-800 rounded-xl border overflow-hidden transition-all duration-200',
        'hover:shadow-lg dark:hover:shadow-zinc-900/50',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-zinc-200 dark:border-zinc-700',
        file.isDirectory && 'cursor-pointer'
      )}
      onClick={() => file.isDirectory && onNavigate()}
    >
      {/* Image Preview or Icon */}
      <div
        className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center relative overflow-hidden"
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!file.isDirectory && onPreview) {
            onPreview();
          }
        }}
      >
        {isImage && !file.isDirectory && !imageError ? (
          <img
            src={`${API_BASE}/api/file/preview?path=${encodeURIComponent(file.path)}`}
            alt={file.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
            onError={() => setImageError(true)}
          />
        ) : (
          <Icon
            className={cn(
              'w-12 h-12 transition-transform duration-300 group-hover:scale-110',
              file.isDirectory
                ? 'text-yellow-500'
                : file.isSupported
                ? 'text-blue-400'
                : 'text-zinc-400'
            )}
          />
        )}

        {/* Checkbox overlay */}
        {!file.isDirectory && file.isSupported && (
          <div
            className="absolute top-3 left-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
            />
          </div>
        )}

        {/* Action buttons overlay */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {/* Preview button */}
          {!file.isDirectory && onPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="p-2 bg-white/90 dark:bg-zinc-800/90 text-zinc-500 hover:text-blue-500 rounded-lg hover:scale-110 transition-all duration-200"
              title="Preview"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-white/90 dark:bg-zinc-800/90 text-zinc-500 hover:text-red-500 rounded-lg hover:scale-110 transition-all duration-200"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute bottom-3 right-3 p-1.5 bg-green-500 rounded-full">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Regenerating indicator - only show if processing AND no result yet */}
        {isRegenerating && !result && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="p-3 space-y-2">
        {/* Filename */}
        <div className="flex items-start gap-2">
          <Icon
            className={cn(
              'w-4 h-4 mt-0.5 flex-shrink-0',
              file.isDirectory ? 'text-yellow-500' : 'text-blue-400'
            )}
          />
          <span
            className="text-sm text-zinc-800 dark:text-zinc-200 break-all line-clamp-2"
            title={file.name}
          >
            {file.name}
          </span>
        </div>

        {/* Result / Suggested Name */}
        {result && (
          <div className="space-y-2">
            {result.success ? (
              <>
                <div className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                  {isEditing ? (
                    <div
                      className="flex-1 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded text-green-600 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 text-green-500 hover:text-green-400"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 text-red-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-xs text-green-600 dark:text-green-400 break-all line-clamp-2"
                      title={result.suggestedName}
                    >
                      {result.suggestedName}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                {!isEditing && (
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip content="Edit name">
                      <button
                        onClick={handleStartEdit}
                        className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Regenerate Name">
                      <button
                        onClick={onRegenerate}
                        disabled={isRegenerating}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          isRegenerating
                            ? 'text-yellow-500 cursor-wait'
                            : 'text-zinc-400 hover:text-yellow-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        )}
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip content="Approve Name">
                      <button
                        onClick={onApply}
                        className="p-1.5 text-zinc-400 hover:text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Revert to Original">
                      <button
                        onClick={onKeepOriginal}
                        className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                )}

                {/* Validation warning */}
                {result.validationFailed && (
                  <Tooltip content={result.validationReason || 'Validation failed after all attempts'}>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs truncate">
                        Could not validate ({result.validationAttempts} attempts)
                      </span>
                    </div>
                  </Tooltip>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <X className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-500 truncate">{result.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons for unprocessed files */}
        {!result && !isCompleted && !file.isDirectory && (
          <div
            className="flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {isEditing ? (
              <div className="flex items-center gap-1 w-full">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDirectEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="flex-1 text-xs bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveDirectEdit}
                  className="p-1 text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-xs text-zinc-500">{file.sizeKB} KB</span>
                <div className="flex items-center gap-1">
                  <Tooltip content="Rename file">
                    <button
                      onClick={handleStartDirectEdit}
                      className="p-1.5 text-zinc-400 hover:text-purple-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Generate Name">
                    <button
                      onClick={onRegenerate}
                      disabled={isRegenerating}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        isRegenerating
                          ? 'text-blue-500 cursor-wait'
                          : 'text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      )}
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip content="Skip">
                    <button
                      onClick={onKeepOriginal}
                      className="p-1.5 text-zinc-400 hover:text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        )}

        {/* File size for directories or completed */}
        {(file.isDirectory || isCompleted || result) && !result && (
          <div className="text-xs text-zinc-500">
            {file.isDirectory ? 'Folder' : `${file.sizeKB} KB`}
          </div>
        )}
      </div>
    </motion.div>
  );
}
