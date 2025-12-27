'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Play, X, Loader2 } from 'lucide-react';
import { Button } from './Button';
import type { PendingQueueResponse } from '@/types/api';

interface ResumeBannerProps {
  pendingQueue: PendingQueueResponse;
  onResume: () => void;
  onDismiss: () => void;
}

export function ResumeBanner({ pendingQueue, onResume, onDismiss }: ResumeBannerProps) {
  const [isResuming, setIsResuming] = useState(false);

  const handleResume = async () => {
    setIsResuming(true);
    await onResume();
  };

  const remaining = pendingQueue.files.length;
  const completed = pendingQueue.completed || 0;
  const total = pendingQueue.total || remaining;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800"
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Interrupted processing detected
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {remaining} files remaining ({completed} of {total} completed)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onDismiss}
              disabled={isResuming}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={handleResume}
              disabled={isResuming}
              className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isResuming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Resume Processing
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
