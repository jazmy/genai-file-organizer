'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LogsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Logs page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Logs & Evaluation
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center text-center gap-4 p-8">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Failed to load logs
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
                We couldn&apos;t load the logs page. The server might be unavailable.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="w-full max-w-md mt-4 text-left bg-zinc-800 dark:bg-zinc-950 rounded-lg p-4 overflow-auto max-h-32">
                <p className="text-red-400 text-xs font-mono">
                  {error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
