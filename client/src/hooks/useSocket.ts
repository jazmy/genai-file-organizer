import { useEffect, useState, useCallback } from 'react';
import { socketManager, type SocketEventHandler } from '@/lib/socket';

interface SocketState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
}

/**
 * Hook to access socket connection state and methods
 */
export function useSocket() {
  const [state, setState] = useState<SocketState>({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    lastError: null,
  });

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = socketManager.onStateChange(setState);
    return unsubscribe;
  }, []);

  const reconnect = useCallback(() => {
    socketManager.reconnect();
  }, []);

  const disconnect = useCallback(() => {
    socketManager.disconnect();
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketManager.emit(event, data);
  }, []);

  return {
    ...state,
    reconnect,
    disconnect,
    emit,
  };
}

/**
 * Hook to subscribe to specific socket events
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const wrappedHandler: SocketEventHandler = (data) => {
      handler(data as T);
    };

    const unsubscribe = socketManager.on(event, wrappedHandler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Hook to subscribe to multiple socket events
 */
export function useSocketEvents(
  events: Record<string, SocketEventHandler>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribes = Object.entries(events).map(([event, handler]) => {
      return socketManager.on(event, handler);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
