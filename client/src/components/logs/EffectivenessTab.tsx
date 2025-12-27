'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Edit2, X, SkipForward, File, MessageSquare, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getPromptEffectiveness, getLowPerformingCategories, getRecentRejections } from '@/lib/api/logs';
import { FeedbackDetailModal } from './FeedbackDetailModal';
import type { CategoryEffectiveness, RecentRejection, TimeRange, FeedbackActionType } from '@/types/logs';

interface EffectivenessTabProps {
  timeRange: TimeRange;
}

function formatPercentage(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(1)}%`;
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EffectivenessTab({ timeRange }: EffectivenessTabProps) {
  const [effectiveness, setEffectiveness] = useState<CategoryEffectiveness[]>([]);
  const [lowPerforming, setLowPerforming] = useState<CategoryEffectiveness[]>([]);
  const [recentRejections, setRecentRejections] = useState<RecentRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<FeedbackActionType | null>(null);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [effResult, lowResult, rejResult] = await Promise.all([
        getPromptEffectiveness(timeRange),
        getLowPerformingCategories(50, timeRange),
        getRecentRejections(10, timeRange),
      ]);
      setEffectiveness(effResult.effectiveness);
      setLowPerforming(lowResult.lowPerforming);
      setRecentRejections(rejResult.rejections);
    } catch (error) {
      console.error('Failed to load effectiveness data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const totalSuggestions = effectiveness.reduce((sum, e) => sum + e.total_suggestions, 0);
  const totalAccepted = effectiveness.reduce((sum, e) => sum + e.accepted, 0);
  const totalEdited = effectiveness.reduce((sum, e) => sum + e.edited, 0);
  const totalRejected = effectiveness.reduce((sum, e) => sum + e.rejected, 0);
  const totalSkipped = effectiveness.reduce((sum, e) => sum + e.skipped, 0);
  const overallAcceptanceRate = totalSuggestions > 0
    ? ((totalAccepted / totalSuggestions) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setSelectedAction('total')}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <File className="w-5 h-5 text-zinc-500" />
            <span className="text-sm text-zinc-500">Total</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{totalSuggestions.toLocaleString()}</p>
        </button>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-zinc-500">Acceptance Rate</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{overallAcceptanceRate}%</p>
        </div>

        <button
          onClick={() => setSelectedAction('accepted')}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-zinc-500">Accepted</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{totalAccepted.toLocaleString()}</p>
        </button>

        <button
          onClick={() => setSelectedAction('edited')}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Edit2 className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-zinc-500">Edited</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{totalEdited.toLocaleString()}</p>
        </button>

        <button
          onClick={() => setSelectedAction('rejected')}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-red-300 dark:hover:border-red-700 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <X className="w-5 h-5 text-red-500" />
            <span className="text-sm text-zinc-500">Rejected</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{totalRejected.toLocaleString()}</p>
        </button>

        <button
          onClick={() => setSelectedAction('skipped')}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <SkipForward className="w-5 h-5 text-zinc-500" />
            <span className="text-sm text-zinc-500">Skipped</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{totalSkipped.toLocaleString()}</p>
        </button>
      </div>

      {/* Alerts for low-performing categories */}
      {lowPerforming.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                {lowPerforming.length} categor{lowPerforming.length === 1 ? 'y' : 'ies'} need attention
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                The following categories have acceptance rates below 50%. Consider reviewing and improving their prompts:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowPerforming.map((cat) => (
                  <span
                    key={cat.detected_category}
                    className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200 rounded"
                  >
                    {formatCategory(cat.detected_category)} ({formatPercentage(cat.acceptance_rate)})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Performance Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Performance by Category</h3>
        </div>

        {effectiveness.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No feedback data available yet. Process some files and provide feedback to see metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Accepted
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Edited
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Rejected
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Skipped
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Avg Edit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {effectiveness.map((cat) => {
                  const rate = cat.acceptance_rate || 0;
                  const isLow = rate < 50;

                  return (
                    <tr
                      key={cat.detected_category}
                      className={cn(
                        'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
                        isLow && 'bg-red-50/50 dark:bg-red-900/10'
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {formatCategory(cat.detected_category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                        {cat.total_suggestions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">
                        {cat.accepted.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-blue-600">
                        {cat.edited.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">
                        {cat.rejected.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-500">
                        {cat.skipped.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLow ? (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          )}
                          <span className={cn(
                            'font-medium',
                            isLow ? 'text-red-600' : 'text-green-600'
                          )}>
                            {formatPercentage(cat.acceptance_rate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                        {cat.avg_edit_distance !== null ? cat.avg_edit_distance.toFixed(1) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Rejections */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Recent Feedback & Regenerations</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Analyze these to improve prompts for better suggestions
          </p>
        </div>

        {recentRejections.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No rejections, edits, or regenerations recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentRejections.map((rejection) => (
              <div key={rejection.request_id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {rejection.file_name}
                      </span>
                      {rejection.user_action ? (
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded',
                          rejection.user_action === 'rejected'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        )}>
                          {rejection.user_action}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          pending
                        </span>
                      )}
                      {rejection.is_regeneration === 1 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <RefreshCw className="w-3 h-3" />
                          regen
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-500 space-y-1">
                      <p>
                        <span className="text-zinc-400">Category:</span> {formatCategory(rejection.detected_category)}
                      </p>
                      {rejection.rejected_name && (
                        <p>
                          <span className="text-zinc-400">Rejected:</span>{' '}
                          <span className="font-mono text-orange-600 dark:text-orange-400 line-through">
                            {rejection.rejected_name}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="text-zinc-400">Suggested:</span>{' '}
                        <span className={cn(
                          "font-mono",
                          rejection.user_action === 'rejected'
                            ? "text-red-600 dark:text-red-400 line-through"
                            : "text-zinc-600 dark:text-zinc-400"
                        )}>
                          {rejection.suggested_name}
                        </span>
                      </p>
                      {rejection.final_name && (
                        <p>
                          <span className="text-zinc-400">Final:</span>{' '}
                          <span className="font-mono text-green-600 dark:text-green-400">
                            {rejection.final_name}
                          </span>
                          {rejection.edit_distance !== null && (
                            <span className="ml-2 text-xs text-zinc-400">
                              ({rejection.edit_distance} edits)
                            </span>
                          )}
                        </p>
                      )}
                      {rejection.regeneration_feedback && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">User feedback:</span>
                              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-0.5">
                                {rejection.regeneration_feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 whitespace-nowrap">
                    {formatDateTime(rejection.feedback_at || rejection.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {selectedAction && (
        <FeedbackDetailModal
          actionType={selectedAction}
          timeRange={timeRange}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </div>
  );
}
