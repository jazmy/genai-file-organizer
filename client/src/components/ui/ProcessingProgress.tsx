'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, X, Clock, CheckCircle, AlertTriangle, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ProcessingProgressProps {
  current: number;
  total: number;
  isProcessing: boolean;
  startTime?: number;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  currentFileName?: string;
  errorCount?: number;
  showEstimate?: boolean;
  className?: string;
}

export function ProcessingProgress({
  current,
  total,
  isProcessing,
  startTime,
  onCancel,
  onPause,
  onResume,
  isPaused = false,
  currentFileName,
  errorCount = 0,
  showEstimate = true,
  className,
}: ProcessingProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!isProcessing || !startTime || isPaused) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, startTime, isPaused]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  }, [current, total]);

  // Estimate remaining time
  const estimatedRemaining = useMemo(() => {
    if (!startTime || current === 0 || !isProcessing) return null;
    const elapsed = elapsedTime;
    const avgTimePerItem = elapsed / current;
    const remaining = total - current;
    return Math.round(avgTimePerItem * remaining);
  }, [current, total, elapsedTime, startTime, isProcessing]);

  // Format time display
  const formatTime = (ms: number): string => {
    if (ms < 1000) return '< 1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Determine status color
  const statusColor = useMemo(() => {
    if (!isProcessing && current === total && total > 0) return 'bg-green-500';
    if (errorCount > 0) return 'bg-amber-500';
    if (isPaused) return 'bg-yellow-500';
    return 'bg-blue-500';
  }, [isProcessing, current, total, errorCount, isPaused]);

  if (!isProcessing && current === 0 && total === 0) {
    return null;
  }

  return (
    <div className={cn(
      'bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isProcessing && !isPaused ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : isPaused ? (
            <Pause className="w-4 h-4 text-yellow-500" />
          ) : current === total && total > 0 ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-zinc-400" />
          )}
          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
            {isProcessing
              ? isPaused
                ? 'Processing Paused'
                : 'Processing Files...'
              : current === total && total > 0
                ? 'Processing Complete'
                : 'Processing Stopped'
            }
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onPause && onResume && isProcessing && (
            <button
              onClick={isPaused ? onResume : onPause}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-zinc-500" />
              ) : (
                <Pause className="w-4 h-4 text-zinc-500" />
              )}
            </button>
          )}
          {onCancel && isProcessing && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            'absolute left-0 top-0 h-full transition-all duration-300 rounded-full',
            statusColor
          )}
          style={{ width: `${progress}%` }}
        />
        {/* Animated shimmer effect */}
        {isProcessing && !isPaused && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]" />
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="font-medium">
            {current} / {total} files ({progress}%)
          </span>
          {errorCount > 0 && (
            <span className="text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {showEstimate && isProcessing && estimatedRemaining !== null && !isPaused && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>~{formatTime(estimatedRemaining)} remaining</span>
          </div>
        )}

        {elapsedTime > 0 && (!isProcessing || isPaused) && (
          <span>Elapsed: {formatTime(elapsedTime)}</span>
        )}
      </div>

      {/* Current file indicator */}
      {currentFileName && isProcessing && !isPaused && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            Processing: <span className="text-zinc-700 dark:text-zinc-300">{currentFileName}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function ProcessingProgressCompact({
  current,
  total,
  isProcessing,
  className,
}: Pick<ProcessingProgressProps, 'current' | 'total' | 'isProcessing' | 'className'>) {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
      <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 tabular-nums">{progress}%</span>
    </div>
  );
}

export default ProcessingProgress;
