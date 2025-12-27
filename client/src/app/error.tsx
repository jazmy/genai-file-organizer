'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-8">
      <div className="flex flex-col items-center text-center gap-6 max-w-md">
        <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
          <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Something went wrong
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            We encountered an unexpected error while loading this page.
            Please try again or return home.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="w-full mt-4 text-left bg-zinc-800 dark:bg-zinc-950 rounded-lg p-4 overflow-auto max-h-48">
            <p className="text-red-400 text-xs font-mono mb-2">
              {error.name}: {error.message}
            </p>
            {error.digest && (
              <p className="text-zinc-500 text-xs font-mono">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
