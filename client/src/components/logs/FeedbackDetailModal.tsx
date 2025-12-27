'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Edit2, XCircle, SkipForward, File, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { getFeedbackDetails } from '@/lib/api/logs';
import type { FeedbackDetailItem, FeedbackActionType, TimeRange } from '@/types/logs';

interface FeedbackDetailModalProps {
  actionType: FeedbackActionType;
  timeRange: TimeRange;
  onClose: () => void;
}

const actionConfig = {
  total: { icon: File, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800', label: 'All Feedback' },
  accepted: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Accepted' },
  edited: { icon: Edit2, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Edited' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Rejected' },
  skipped: { icon: SkipForward, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800', label: 'Skipped' },
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function FeedbackDetailModal({ actionType, timeRange, onClose }: FeedbackDetailModalProps) {
  const [items, setItems] = useState<FeedbackDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const config = actionConfig[actionType];
  const ActionIcon = config.icon;

  useEffect(() => {
    loadData();
  }, [actionType, timeRange, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getFeedbackDetails(actionType, timeRange, page, limit);
      setItems(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load feedback details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', config.bg)}>
              <ActionIcon className={cn('w-5 h-5', config.color)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {config.label} Files
              </h2>
              <p className="text-sm text-zinc-500">
                {total.toLocaleString()} file{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              No files found for this action type
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items.map((item) => (
                <div
                  key={item.request_id}
                  className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {item.file_name}
                        </span>
                        {actionType === 'total' && (
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded capitalize',
                            item.user_action === 'accepted' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            item.user_action === 'edited' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            item.user_action === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                            item.user_action === 'skipped' && 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                          )}>
                            {item.user_action}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500 space-y-1">
                        <p className="truncate" title={item.file_path}>
                          <span className="text-zinc-400">Path:</span> {item.file_path}
                        </p>
                        <p>
                          <span className="text-zinc-400">Category:</span> {formatCategory(item.detected_category)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <p>
                            <span className="text-zinc-400">Suggested:</span>{' '}
                            <span className={cn(
                              'font-mono',
                              (item.user_action === 'rejected' || item.user_action === 'edited') && 'line-through text-zinc-400'
                            )}>
                              {item.suggested_name}
                            </span>
                          </p>
                          {item.final_name && item.final_name !== item.suggested_name && (
                            <p>
                              <span className="text-zinc-400">Final:</span>{' '}
                              <span className="font-mono text-green-600 dark:text-green-400">
                                {item.final_name}
                              </span>
                              {item.edit_distance !== null && (
                                <span className="ml-1 text-xs text-zinc-400">
                                  ({item.edit_distance} edits)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 whitespace-nowrap">
                      {formatDateTime(item.feedback_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-500">
              Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages || loading}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Close Footer (when no pagination) */}
        {totalPages <= 1 && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
