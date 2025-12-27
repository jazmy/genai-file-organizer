'use client';

import { useMemo } from 'react';
import { Undo2, Redo2, Clock, FileEdit, Files, Trash2, X, SkipForward } from 'lucide-react';
import { useHistoryStore, type ActionType } from '@/stores/historyStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

interface HistoryPanelProps {
  onClose?: () => void;
  className?: string;
}

const actionIcons: Record<ActionType, typeof FileEdit> = {
  rename: FileEdit,
  batch_rename: Files,
  keep_original: SkipForward,
  delete: Trash2,
  edit_name: FileEdit,
};

const actionLabels: Record<ActionType, string> = {
  rename: 'Renamed',
  batch_rename: 'Batch Rename',
  keep_original: 'Kept Original',
  delete: 'Deleted',
  edit_name: 'Edited Name',
};

const actionColors: Record<ActionType, string> = {
  rename: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  batch_rename: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  keep_original: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800',
  delete: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  edit_name: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
};

export function HistoryPanel({ onClose, className }: HistoryPanelProps) {
  const { undoStack, redoStack, canUndo, canRedo, clearHistory } = useHistoryStore();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Combine and sort history for display
  const allHistory = useMemo(() => {
    const combined = [
      ...undoStack.map(action => ({ ...action, inUndoStack: true })),
      ...redoStack.map(action => ({ ...action, inUndoStack: false })),
    ].sort((a, b) => b.timestamp - a.timestamp);
    return combined;
  }, [undoStack, redoStack]);

  return (
    <div className={cn(
      "flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">History</h3>
          <span className="text-xs text-zinc-500">
            ({undoStack.length} actions)
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Undo/Redo Controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canUndo()}
          onClick={() => {
            // This will be handled by the parent component or useUndo hook
            window.dispatchEvent(new CustomEvent('history:undo'));
          }}
          className="flex-1 gap-1"
        >
          <Undo2 className="w-3 h-3" />
          Undo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canRedo()}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('history:redo'));
          }}
          className="flex-1 gap-1"
        >
          <Redo2 className="w-3 h-3" />
          Redo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={allHistory.length === 0}
          onClick={() => {
            if (confirm('Clear all history? This cannot be undone.')) {
              clearHistory();
            }
          }}
          className="text-xs"
        >
          Clear
        </Button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {allHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No history yet</p>
            <p className="text-xs mt-1">Actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {allHistory.map((action, index) => {
              const Icon = actionIcons[action.type];
              const colorClass = actionColors[action.type];

              return (
                <div
                  key={`${action.timestamp}-${index}`}
                  className={cn(
                    "px-4 py-3 transition-colors",
                    action.inUndoStack
                      ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      : "opacity-50 bg-zinc-50 dark:bg-zinc-800/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded", colorClass)}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {actionLabels[action.type]}
                        </span>
                        {!action.inUndoStack && (
                          <span className="text-xs px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                            Undone
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {action.description}
                      </p>
                      {action.type === 'batch_rename' && action.files && (
                        <p className="text-xs text-zinc-400 mt-1">
                          {action.files.length} files
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatTime(action.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        <div className="flex items-center justify-between">
          <span>
            {canUndo() ? `${undoStack.length} undoable` : 'Nothing to undo'}
          </span>
          <span>
            {canRedo() ? `${redoStack.length} redoable` : ''}
          </span>
        </div>
        <p className="mt-1 text-zinc-400">
          Ctrl+Z to undo, Ctrl+Shift+Z to redo
        </p>
      </div>
    </div>
  );
}

export default HistoryPanel;
