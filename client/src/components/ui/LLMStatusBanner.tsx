'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  checks?: {
    ai?: {
      status: string;
      provider: string;
      connected: boolean;
      model: string;
    };
  };
}

export function LLMStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/health?detailed=true`);
      const data: HealthStatus = await response.json();

      if (data.checks?.ai) {
        setProvider(data.checks.ai.provider || 'unknown');
        const wasOffline = isOffline;
        const nowOffline = !data.checks.ai.connected;
        setIsOffline(nowOffline);

        // Reset dismissed state when connection is restored then lost again
        if (!wasOffline && nowOffline) {
          setIsDismissed(false);
        }
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    }
  }, [isOffline]);

  const retryConnection = useCallback(async () => {
    setIsRetrying(true);
    await checkHealth();
    setIsRetrying(false);
  }, [checkHealth]);

  useEffect(() => {
    checkHealth();

    // Poll every 5 seconds when offline, 30 seconds when online
    const interval = setInterval(checkHealth, isOffline ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [checkHealth, isOffline]);

  const providerLabel = provider === 'llama-server' ? 'llama-server' : 'Ollama';
  const helpCommand = provider === 'llama-server'
    ? 'npm run llama-server'
    : 'ollama serve';

  // Don't show if connected or dismissed
  if (!isOffline || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={cn(
          'bg-red-600 dark:bg-red-900 text-white',
          'px-4 py-3 shadow-lg'
        )}
      >
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold">
                {providerLabel} is not connected
              </span>
              <span className="text-red-100 dark:text-red-200 text-sm">
                AI processing is unavailable. Run{' '}
                <code className="bg-red-700 dark:bg-red-800 px-1.5 py-0.5 rounded font-mono text-xs">
                  {helpCommand}
                </code>
                {' '}to start it.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Retry button */}
            <button
              onClick={retryConnection}
              disabled={isRetrying}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
                'bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700',
                'transition-colors',
                isRetrying && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Checking...' : 'Retry'}
            </button>

            {/* Settings link */}
            <a
              href="/settings"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
                'bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700',
                'transition-colors'
              )}
            >
              <ExternalLink className="w-4 h-4" />
              Settings
            </a>

            {/* Dismiss button */}
            <button
              onClick={() => setIsDismissed(true)}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-red-700 dark:hover:bg-red-800',
                'transition-colors'
              )}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
