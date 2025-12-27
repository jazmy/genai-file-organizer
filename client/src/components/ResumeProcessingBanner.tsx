'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, X, AlertCircle, Clock } from 'lucide-react';
import { useProcessingStore } from '@/stores/processingStore';
import { cn } from '@/lib/utils/cn';

interface ResumeProcessingBannerProps {
  onResume?: (remainingFiles: string[]) => void;
}

export function ResumeProcessingBanner({ onResume }: ResumeProcessingBannerProps) {
  const {
    hasInterruptedBatch,
    interruptedBatch,
    clearInterruptedBatch,
    getRemainingFiles,
  } = useProcessingStore();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if there's an interrupted batch and we're not currently processing
    if (hasInterruptedBatch && interruptedBatch) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [hasInterruptedBatch, interruptedBatch]);

  if (!isVisible || !interruptedBatch) {
    return null;
  }

  const remainingFiles = getRemainingFiles();
  const processedCount = interruptedBatch.processedFiles.length;
  const totalCount = interruptedBatch.total;
  const remainingCount = remainingFiles.length;

  // Format the interrupted time
  const interruptedDate = new Date(interruptedBatch.interruptedAt);
  const timeAgo = getTimeAgo(interruptedDate);

  const handleResume = () => {
    if (onResume && remainingFiles.length > 0) {
      onResume(remainingFiles);
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    clearInterruptedBatch();
    setIsVisible(false);
  };

  return (
    <div className={cn(
      'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
      'bg-amber-50 dark:bg-amber-900/30',
      'border border-amber-200 dark:border-amber-800',
      'rounded-xl shadow-lg',
      'px-4 py-3',
      'max-w-md w-full mx-4',
      'animate-in slide-in-from-bottom-4 duration-300'
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Interrupted Processing
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {processedCount} of {totalCount} files processed
            {remainingCount > 0 && ` (${remainingCount} remaining)`}
          </p>
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
            <Clock className="w-3 h-3" />
            <span>Interrupted {timeAgo}</span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleResume}
              disabled={remainingCount === 0}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-amber-600 text-white hover:bg-amber-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Resume ({remainingCount} files)
            </button>

            <button
              onClick={handleDismiss}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300',
                'hover:bg-amber-200 dark:hover:bg-amber-800',
                'transition-colors'
              )}
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors"
        >
          <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  }
  if (diffHour > 0) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  }
  if (diffMin > 0) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  }
  return 'just now';
}

export default ResumeProcessingBanner;
