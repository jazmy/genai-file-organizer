'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Cpu, RefreshCw, Server } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProcessingStore } from '@/stores/processingStore';
import { Progress } from '@/components/ui/Progress';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  checks?: {
    ai?: {
      status: string;
      provider: string;
      connected: boolean;
      model: string;
      lastCheck: string;
    };
  };
}

type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'reconnecting';

export function StatusBar() {
  const { isBatchProcessing, currentIndex, total } = useProcessingStore();
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [provider, setProvider] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [lastCheck, setLastCheck] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/health?detailed=true`);
      const data: HealthStatus = await response.json();

      if (data.checks?.ai) {
        const ai = data.checks.ai;
        setProvider(ai.provider || 'unknown');
        setModel(ai.model || 'unknown');
        setLastCheck(ai.lastCheck || '');
        setStatus(ai.connected ? 'connected' : 'disconnected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  const retryConnection = useCallback(async () => {
    setIsRetrying(true);
    setStatus('reconnecting');
    await checkHealth();
    setIsRetrying(false);
  }, [checkHealth]);

  useEffect(() => {
    checkHealth();

    // Poll more frequently when disconnected (5s), less when connected (30s)
    const getInterval = () => status === 'disconnected' ? 5000 : 30000;

    let interval = setInterval(checkHealth, getInterval());

    // Update interval when status changes
    return () => clearInterval(interval);
  }, [checkHealth, status]);

  // Re-setup interval when status changes
  useEffect(() => {
    const intervalMs = status === 'disconnected' ? 5000 : 30000;
    const interval = setInterval(checkHealth, intervalMs);
    return () => clearInterval(interval);
  }, [status, checkHealth]);

  const providerLabel = provider === 'llama-server' ? 'llama-server' : 'Ollama';
  const isOffline = status === 'disconnected';

  return (
    <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 py-2">
      <div className="flex items-center justify-between text-xs">
        {/* Left: Processing Status */}
        <div className="flex items-center gap-4">
          {isBatchProcessing && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Cpu className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-zinc-600 dark:text-zinc-400">
                Processing {currentIndex} of {total}
              </span>
              <div className="w-32">
                <Progress value={currentIndex} max={total} size="sm" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Provider Status */}
        <div className="flex items-center gap-2">
          {/* Retry button when disconnected */}
          <AnimatePresence>
            {isOffline && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={retryConnection}
                disabled={isRetrying}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs',
                  'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700',
                  'text-zinc-600 dark:text-zinc-400',
                  'transition-colors',
                  isRetrying && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('w-3 h-3', isRetrying && 'animate-spin')} />
                Retry
              </motion.button>
            )}
          </AnimatePresence>

          {/* Status Badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all',
              status === 'connected'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : status === 'reconnecting'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : status === 'disconnected'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            )}
            title={status === 'connected'
              ? `Connected to ${providerLabel}\nModel: ${model}\nLast check: ${lastCheck ? new Date(lastCheck).toLocaleTimeString() : 'N/A'}`
              : `${providerLabel} is offline. Check that ${provider === 'llama-server' ? 'llama-server is running (npm run llama-server)' : 'Ollama is running (ollama serve)'}`
            }
          >
            <Server className="w-3 h-3" />
            {status === 'connected' ? (
              <Wifi className="w-3 h-3" />
            ) : status === 'reconnecting' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            <span className="font-medium">
              {status === 'checking' && 'Checking...'}
              {status === 'reconnecting' && 'Reconnecting...'}
              {status === 'connected' && `${providerLabel}`}
              {status === 'disconnected' && `${providerLabel} Offline`}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
