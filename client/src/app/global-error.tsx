'use client';

import { Inter } from 'next/font/google';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
          <div className="flex flex-col items-center text-center gap-6 max-w-md">
            <div className="rounded-full bg-red-900/30 p-4">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-zinc-100">
                Critical Error
              </h1>
              <p className="text-zinc-400 mt-2">
                Something went wrong with the application.
                Please try refreshing the page.
              </p>
            </div>

            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>

            {process.env.NODE_ENV === 'development' && (
              <div className="w-full mt-4 text-left bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-auto max-h-48">
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
      </body>
    </html>
  );
}
