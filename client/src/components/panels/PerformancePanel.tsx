'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Server,
  HardDrive,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useMetricsStore } from '@/stores/metricsStore';
import { cn } from '@/lib/utils/cn';

interface PerformancePanelProps {
  onClose: () => void;
  className?: string;
}

export function PerformancePanel({ onClose, className }: PerformancePanelProps) {
  const {
    metrics,
    loading,
    error,
    lastFetched,
    autoRefresh,
    refreshInterval,
    fetchMetrics,
    resetAllMetrics,
    setAutoRefresh,
  } = useMetricsStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch metrics on mount and set up auto-refresh
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchMetrics, refreshInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  const formatTime = (ms: number | undefined | null) => {
    if (ms == null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value == null) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const formatMB = (value: number | undefined | null) => {
    if (value == null) return 'N/A';
    return `${value.toFixed(1)} MB`;
  };

  const getMemoryStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-yellow-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-zinc-400" />;
    }
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
          <Activity className="w-5 h-5 text-blue-500" />
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Performance</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh && 'text-blue-600 dark:text-blue-400')}
          >
            <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && !metrics && (
          <div className="text-center py-8 text-zinc-500">Loading metrics...</div>
        )}

        {metrics && (
          <>
            {/* System Uptime */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">System</span>
              </div>
              <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
                {metrics.system?.uptimeFormatted || 'N/A'}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Uptime</div>
            </div>

            {/* Processing Stats */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Processing
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                    {metrics.processing?.total ?? 0}
                  </div>
                  <div className="text-xs text-zinc-500">Total Files</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatPercent(metrics.processing?.successRate)}
                  </div>
                  <div className="text-xs text-zinc-500">Success Rate</div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {metrics.processing?.succeeded ?? 0}
                    </div>
                    <div className="text-xs text-zinc-500">Succeeded</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {metrics.processing?.failed ?? 0}
                    </div>
                    <div className="text-xs text-zinc-500">Failed</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-500">
                    Avg: {formatTime(metrics.processing?.avgProcessingTimeMs)} | P95:{' '}
                    {formatTime(metrics.processing?.p95ProcessingTimeMs)}
                  </span>
                </div>
              </div>
            </div>

            {/* API Stats */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">API</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                    {metrics.api?.totalRequests ?? 0}
                  </div>
                  <div className="text-xs text-zinc-500">Total Requests</div>
                </div>
                <div>
                  <div
                    className={cn(
                      'text-xl font-bold',
                      (metrics.api?.errorRate ?? 0) > 5 ? 'text-red-500' : 'text-green-600 dark:text-green-400'
                    )}
                  >
                    {formatPercent(metrics.api?.errorRate)}
                  </div>
                  <div className="text-xs text-zinc-500">Error Rate</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-500">
                    Avg: {formatTime(metrics.api?.avgResponseTimeMs)} | P95:{' '}
                    {formatTime(metrics.api?.p95ResponseTimeMs)}
                  </span>
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Memory
                  </span>
                </div>
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded',
                    metrics.memory?.status === 'critical'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : metrics.memory?.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  )}
                >
                  {metrics.memory?.status || 'unknown'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Heap Used</span>
                  <span className={cn('font-medium', getMemoryStatusColor(metrics.memory?.status || 'normal'))}>
                    {formatMB(metrics.memory?.current?.heapUsedMB)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Heap Total</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {formatMB(metrics.memory?.current?.heapTotalMB)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">RSS</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {formatMB(metrics.memory?.current?.rssMB)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-500">Trend</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metrics.memory?.trend?.direction || 'stable')}
                    <span className="text-xs text-zinc-500">
                      {formatPercent(metrics.memory?.trend?.changePercent)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Queue */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Queue</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                    {metrics.queue?.pending ?? 0}
                  </div>
                  <div className="text-xs text-zinc-500">Pending</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                    {metrics.queue?.completed ?? 0}
                  </div>
                  <div className="text-xs text-zinc-500">Completed</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={resetAllMetrics}
              >
                <RotateCcw className="w-4 h-4" />
                Reset Metrics
              </Button>
            </div>

            {/* Last Updated */}
            {lastFetched && (
              <div className="text-center text-xs text-zinc-400">
                Last updated: {new Date(lastFetched).toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
