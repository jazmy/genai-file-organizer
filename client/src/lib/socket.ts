import { io, Socket } from 'socket.io-client';

export type SocketEventHandler = (data: unknown) => void;

interface SocketConfig {
  url: string;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

interface SocketState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
}

type StateChangeCallback = (state: SocketState) => void;

class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private eventHandlers: Map<string, Set<SocketEventHandler>> = new Map();
  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private state: SocketState = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    lastError: null,
  };

  constructor() {
    this.config = {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    };
  }

  /**
   * Initialize socket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(this.config.url, {
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.setupEventListeners();
  }

  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.updateState({
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0,
        lastError: null,
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.updateState({
        connected: false,
        reconnecting: reason !== 'io client disconnect',
        lastError: reason,
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.updateState({
        connected: false,
        lastError: error.message,
      });
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      this.updateState({
        reconnecting: true,
        reconnectAttempts: attempt,
      });
    });

    this.socket.io.on('reconnect', () => {
      this.updateState({
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0,
        lastError: null,
      });
    });

    this.socket.io.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error.message);
      this.updateState({
        lastError: error.message,
      });
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after max attempts');
      this.updateState({
        reconnecting: false,
        lastError: 'Reconnection failed after maximum attempts',
      });
    });

    // Re-register existing event handlers
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket?.on(event, handler);
      });
    });
  }

  /**
   * Update internal state and notify callbacks
   */
  private updateState(partial: Partial<SocketState>): void {
    this.state = { ...this.state, ...partial };
    this.stateCallbacks.forEach((callback) => callback(this.state));
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    // Immediately call with current state
    callback(this.state);

    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  /**
   * Get current state
   */
  getState(): SocketState {
    return { ...this.state };
  }

  /**
   * Subscribe to a socket event
   */
  on(event: string, handler: SocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Register with socket if connected
    this.socket?.on(event, handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from a socket event
   */
  off(event: string, handler: SocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
    this.socket?.off(event, handler);
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit, not connected');
    }
  }

  /**
   * Manually trigger reconnection
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.connect();
    }
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.updateState({
        connected: false,
        reconnecting: false,
      });
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.state.connected;
  }
}

// Singleton instance
export const socketManager = new SocketManager();

// Initialize on client side only
if (typeof window !== 'undefined') {
  socketManager.connect();
}
