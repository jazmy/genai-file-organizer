'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: unknown[];
  level?: 'page' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStack: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys changed
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = this.props.resetKeys;

      const hasChanged = currentKeys.some((key, index) => key !== prevKeys[index]);
      if (hasChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    });
  };

  toggleStack = (): void => {
    this.setState((prev) => ({ showStack: !prev.showStack }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showStack } = this.state;
    const { children, fallback, showDetails = true, level = 'section' } = this.props;

    if (hasError) {
      // If custom fallback provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error UI based on level
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center',
            level === 'page' && 'min-h-screen bg-zinc-100 dark:bg-zinc-950 p-8',
            level === 'section' && 'min-h-[400px] bg-zinc-100 dark:bg-zinc-900 rounded-xl p-8',
            level === 'component' && 'p-4 bg-red-50 dark:bg-red-900/20 rounded-lg'
          )}
        >
          <div className={cn(
            'flex flex-col items-center text-center',
            level === 'component' ? 'gap-2' : 'gap-4'
          )}>
            <div className={cn(
              'rounded-full bg-red-100 dark:bg-red-900/30 p-3',
              level === 'component' && 'p-2'
            )}>
              <AlertTriangle className={cn(
                'text-red-600 dark:text-red-400',
                level === 'component' ? 'w-5 h-5' : 'w-8 h-8'
              )} />
            </div>

            <div>
              <h2 className={cn(
                'font-semibold text-zinc-900 dark:text-zinc-100',
                level === 'page' && 'text-2xl',
                level === 'section' && 'text-xl',
                level === 'component' && 'text-sm'
              )}>
                {level === 'page' ? 'Something went wrong' : 'Error loading content'}
              </h2>
              <p className={cn(
                'text-zinc-500 dark:text-zinc-400 mt-1',
                level === 'component' ? 'text-xs' : 'text-sm'
              )}>
                {level === 'page'
                  ? 'We encountered an unexpected error. Please try again.'
                  : 'This section failed to load properly.'}
              </p>
            </div>

            <div className={cn(
              'flex gap-2',
              level === 'component' && 'mt-1'
            )}>
              <button
                onClick={this.reset}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg font-medium transition-colors',
                  'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
                  'hover:bg-zinc-700 dark:hover:bg-zinc-300',
                  level === 'component' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
                )}
              >
                <RefreshCw className={cn(level === 'component' ? 'w-3 h-3' : 'w-4 h-4')} />
                Try again
              </button>

              {level === 'page' && (
                <Link
                  href="/"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg font-medium transition-colors',
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
                    'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                    'px-4 py-2 text-sm'
                  )}
                >
                  <Home className="w-4 h-4" />
                  Go home
                </Link>
              )}
            </div>

            {showDetails && error && level !== 'component' && (
              <div className="w-full max-w-lg mt-4">
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showStack ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showStack ? 'Hide' : 'Show'} error details
                </button>

                {showStack && (
                  <div className="mt-2 text-left bg-zinc-800 dark:bg-zinc-950 rounded-lg p-4 overflow-auto max-h-64">
                    <p className="text-red-400 text-xs font-mono mb-2">
                      {error.name}: {error.message}
                    </p>
                    {errorInfo?.componentStack && (
                      <pre className="text-zinc-400 text-xs font-mono whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
