'use client';

import React, { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: unknown[];
  level?: 'page' | 'section' | 'component';
}

function DefaultLoading({ level }: { level: 'page' | 'section' | 'component' }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        level === 'page' && 'min-h-screen',
        level === 'section' && 'min-h-[200px]',
        level === 'component' && 'min-h-[100px]'
      )}
    >
      <Loader2 className={cn(
        'animate-spin text-zinc-400',
        level === 'component' ? 'w-5 h-5' : 'w-8 h-8'
      )} />
    </div>
  );
}

export function AsyncErrorBoundary({
  children,
  fallback,
  loadingFallback,
  onError,
  resetKeys,
  level = 'section',
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={onError ? (error) => onError(error) : undefined}
      resetKeys={resetKeys}
      level={level}
    >
      <Suspense fallback={loadingFallback || <DefaultLoading level={level} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default AsyncErrorBoundary;
