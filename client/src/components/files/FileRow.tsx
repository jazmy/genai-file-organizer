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
  ChevronRight,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getFileIcon } from '@/lib/utils/fileHelpers';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tooltip } from '@/components/ui/Tooltip';
import type { FileItem, ProcessResult } from '@/types/files';

interface FileRowProps {
  file: FileItem;
  result?: ProcessResult;
  isSelected: boolean;
  isCompleted: boolean;
  isRegenerating: boolean;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onRegenerate: () => void;
  onApply: (filePath: string, suggestedName: string) => void;
  onKeepOriginal: () => void;
  onEdit: (newName: string) => void;
  onDelete: () => void;
  onDirectRename?: (filePath: string, newName: string) => void;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
  onPreview?: () => void;
}

export function FileRow({
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
  onHover,
  onLeave,
  onPreview,
}: FileRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const Icon = getFileIcon(file);

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

  // Used for direct file renaming via the edit button
  const _handleSaveDirectEdit = () => {
    if (editValue.trim() && editValue.trim() !== file.name && onDirectRename) {
      onDirectRename(file.path, editValue.trim());
    }
    setIsEditing(false);
    setEditValue('');
  };
  void _handleSaveDirectEdit;

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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors',
        'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
        file.isDirectory && 'cursor-pointer'
      )}
      onClick={() => file.isDirectory && onNavigate()}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Checkbox */}
      {!file.isDirectory && file.isSupported ? (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onChange={(e) => onSelect(e.target.checked)} />
        </div>
      ) : (
        <div className="w-5" />
      )}

      {/* Icon */}
      <Icon
        className={cn(
          'w-5 h-5 flex-shrink-0',
          file.isDirectory
            ? 'text-yellow-500'
            : file.isSupported
            ? 'text-blue-400'
            : 'text-zinc-400'
        )}
      />

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate',
              file.isSupported || file.isDirectory
                ? 'text-zinc-800 dark:text-zinc-200'
                : 'text-zinc-500'
            )}
          >
            {file.name}
          </span>
          {file.isDirectory && <ChevronRight className="w-4 h-4 text-zinc-400" />}
          {isCompleted && (
            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
              Completed
            </span>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="flex items-center gap-2 mt-1">
            {result.success ? (
              <>
                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                {isEditing ? (
                  <div
                    className="flex items-center gap-1"
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
                      className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded text-green-600 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-0.5 text-green-500 hover:text-green-400"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-0.5 text-red-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-green-600 dark:text-green-400 truncate">
                      {result.suggestedName}
                    </span>
                    <div
                      className="flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip content="Edit">
                        <button
                          onClick={handleStartEdit}
                          className="p-1 text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Regenerate Name">
                        <button
                          onClick={onRegenerate}
                          disabled={isRegenerating}
                          className={cn(
                            'p-1 rounded transition-colors',
                            isRegenerating
                              ? 'text-yellow-500 cursor-wait'
                              : 'text-zinc-400 hover:text-yellow-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          )}
                        >
                          {isRegenerating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip content="Approve Name">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (result?.suggestedName) {
                              onApply(file.path, result.suggestedName);
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Revert to Original">
                        <button
                          onClick={onKeepOriginal}
                          className="p-1 text-zinc-400 hover:text-orange-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Tooltip>
                    </div>
                  </>
                )}

                {/* Validation warning */}
                {result.validationFailed && (
                  <Tooltip content={result.validationReason || 'Validation failed after all attempts'}>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs">
                        Could not validate
                      </span>
                    </div>
                  </Tooltip>
                )}
              </>
            ) : (
              <>
                <X className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-500 truncate">{result.error}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side: Size and actions */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-zinc-500 w-16 text-right">
          {file.isDirectory ? '' : `${file.sizeKB} KB`}
        </span>

        {/* Rename for unprocessed */}
        {!result && !isCompleted && !file.isDirectory && (
          <Tooltip content="Rename file">
            <button
              onClick={handleStartDirectEdit}
              className="p-1.5 text-zinc-400 hover:text-purple-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Generate name for unprocessed */}
        {!result && !isCompleted && !file.isDirectory && (
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
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </Tooltip>
        )}

        {/* Keep original for unprocessed */}
        {!result && !isCompleted && !file.isDirectory && (
          <Tooltip content="Skip">
            <button
              onClick={onKeepOriginal}
              className="p-1.5 text-zinc-400 hover:text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Preview */}
        {!file.isDirectory && onPreview && (
          <Tooltip content="Preview">
            <button
              onClick={onPreview}
              className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Delete */}
        {!file.isDirectory && (
          <Tooltip content="Delete">
            <button
              onClick={onDelete}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
}
