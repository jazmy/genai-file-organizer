'use client';

import { useState, useCallback } from 'react';

interface ErrorState {
  error: Error | null;
  hasError: boolean;
  errorMessage: string | null;
}

interface UseErrorHandlerReturn extends ErrorState {
  handleError: (error: unknown) => void;
  clearError: () => void;
  wrapAsync: <T>(asyncFn: () => Promise<T>) => Promise<T | undefined>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
    errorMessage: null,
  });

  const handleError = useCallback((error: unknown) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    setErrorState({
      error: errorObj,
      hasError: true,
      errorMessage: errorObj.message,
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by useErrorHandler:', errorObj);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
      errorMessage: null,
    });
  }, []);

  const wrapAsync = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | undefined> => {
    try {
      clearError();
      return await asyncFn();
    } catch (err) {
      handleError(err);
      return undefined;
    }
  }, [handleError, clearError]);

  return {
    ...errorState,
    handleError,
    clearError,
    wrapAsync,
  };
}

export default useErrorHandler;
