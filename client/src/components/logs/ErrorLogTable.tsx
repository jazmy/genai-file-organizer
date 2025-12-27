'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { resolveError } from '@/lib/api/logs';
import type { ErrorLog } from '@/types/logs';

interface ErrorLogTableProps {
  logs: ErrorLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const typeColors: Record<string, string> = {
  ai_error: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  api_error: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  system_error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function ErrorLogTable({
  logs,
  total,
  page,
  limit,
  totalPages,
  loading,
  onPageChange,
  onRefresh,
}: ErrorLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleResolve = async (errorId: string) => {
    setResolvingId(errorId);
    try {
      await resolveError(errorId, resolutionNotes);
      setResolutionNotes('');
      setExpandedId(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to resolve error:', error);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="animate-pulse p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <p className="text-zinc-500">No errors found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {logs.map((log) => {
          const isExpanded = expandedId === log.error_id;
          const typeColor = typeColors[log.error_type] || typeColors.system_error;
          const isResolved = log.resolved === 1;

          return (
            <div key={log.error_id}>
              <div
                className={cn(
                  'flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
                  isResolved && 'opacity-60'
                )}
                onClick={() => setExpandedId(isExpanded ? null : log.error_id)}
              >
                <div className="flex-shrink-0">
                  {isResolved ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded', typeColor)}>
                      {log.error_type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-zinc-500">{formatTime(log.created_at)}</span>
                  </div>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {log.error_message}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Error Details</h4>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">{log.error_message}</p>
                    </div>

                    {log.file_path && (
                      <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">File</h4>
                        <p className="text-sm font-mono text-zinc-600 dark:text-zinc-400">{log.file_path}</p>
                      </div>
                    )}

                    {log.error_stack && (
                      <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Stack Trace</h4>
                        <pre className="text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                          {log.error_stack}
                        </pre>
                      </div>
                    )}

                    {log.context && (
                      <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Context</h4>
                        <pre className="text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                          {log.context}
                        </pre>
                      </div>
                    )}

                    {isResolved ? (
                      <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Resolution</h4>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Resolved {log.resolved_at ? `on ${formatTime(log.resolved_at)}` : ''}
                        </p>
                        {log.resolution_notes && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {log.resolution_notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                        <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Mark as Resolved</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Resolution notes (optional)"
                            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolve(log.error_id)}
                            loading={resolvingId === log.error_id}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-sm text-zinc-500">
          Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} errors
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
