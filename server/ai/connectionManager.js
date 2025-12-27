import { EventEmitter } from 'events';
import { loadConfig } from '../config/default.js';
import logger from '../utils/logger.js';

class OllamaConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.config = loadConfig();
    this.status = 'disconnected';
    this.lastError = null;
    this.retryCount = 0;
    this.maxRetries = 10;
    this.baseDelay = 1000;
    this.maxDelay = 60000;
    this.healthCheckInterval = null;
    this.healthCheckFrequency = 30000; // 30 seconds
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.models = [];
    this.lastSuccessfulCheck = null;
  }

  getStatus() {
    return {
      status: this.status,
      lastError: this.lastError,
      retryCount: this.retryCount,
      models: this.models,
      lastSuccessfulCheck: this.lastSuccessfulCheck,
      queueLength: this.requestQueue.length,
    };
  }

  calculateBackoff() {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.retryCount),
      this.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.config.ollama.host}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.models = data.models || [];
      this.lastSuccessfulCheck = new Date().toISOString();

      const wasDisconnected = this.status !== 'connected';
      this.status = 'connected';
      this.retryCount = 0;
      this.lastError = null;

      if (wasDisconnected) {
        logger.info(`[ConnectionManager] Connected to Ollama at ${this.config.ollama.host}`);
        this.emit('connected', { models: this.models });
        this.processQueue();
      }

      return true;
    } catch (error) {
      const wasConnected = this.status === 'connected';
      this.status = 'disconnected';
      this.lastError = error.message;

      if (wasConnected) {
        logger.warn(`[ConnectionManager] Lost connection to Ollama: ${error.message}`);
        this.emit('disconnected', { error: error.message });
      }

      return false;
    }
  }

  async reconnect() {
    if (this.status === 'reconnecting') {
      return;
    }

    this.status = 'reconnecting';
    this.emit('reconnecting', { attempt: this.retryCount + 1 });

    while (this.retryCount < this.maxRetries) {
      const delay = this.calculateBackoff();
      logger.info(`[ConnectionManager] Reconnection attempt ${this.retryCount + 1}/${this.maxRetries} in ${Math.round(delay)}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));

      if (await this.checkConnection()) {
        return true;
      }

      this.retryCount++;
    }

    logger.error(`[ConnectionManager] Max reconnection attempts reached (${this.maxRetries})`);
    this.status = 'failed';
    this.emit('failed', { error: 'Max reconnection attempts reached' });
    return false;
  }

  startHealthCheck() {
    if (this.healthCheckInterval) {
      return;
    }

    // Initial check
    this.checkConnection();

    // Periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      const wasConnected = this.status === 'connected';
      const isConnected = await this.checkConnection();

      if (!isConnected && wasConnected) {
        // Connection lost, attempt to reconnect
        this.reconnect();
      }
    }, this.healthCheckFrequency);

    logger.info(`[ConnectionManager] Health check started (every ${this.healthCheckFrequency / 1000}s)`);
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('[ConnectionManager] Health check stopped');
    }
  }

  async queueRequest(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      const request = {
        fn: requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      if (this.status === 'connected') {
        // Execute immediately if connected
        this.executeRequest(request);
      } else {
        // Queue for later
        this.requestQueue.push(request);
        this.requestQueue.sort((a, b) => b.priority - a.priority);
        logger.debug(`[ConnectionManager] Request queued (queue size: ${this.requestQueue.length})`);

        // Try to reconnect if not already
        if (this.status !== 'reconnecting') {
          this.reconnect();
        }
      }
    });
  }

  async executeRequest(request) {
    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      // Check if this is a connection error
      if (this.isConnectionError(error)) {
        // Re-queue the request
        this.requestQueue.unshift(request);
        this.status = 'disconnected';
        this.reconnect();
      } else {
        request.reject(error);
      }
    }
  }

  isConnectionError(error) {
    const connectionErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'fetch failed',
      'network error',
    ];
    const errorStr = error.message?.toLowerCase() || '';
    return connectionErrors.some(e => errorStr.includes(e.toLowerCase()));
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.status === 'connected') {
      const request = this.requestQueue.shift();

      // Skip stale requests (older than 5 minutes)
      if (Date.now() - request.timestamp > 300000) {
        request.reject(new Error('Request timed out in queue'));
        continue;
      }

      await this.executeRequest(request);
    }

    this.isProcessingQueue = false;
  }

  async withRetry(fn, maxAttempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Ensure we're connected first
        if (this.status !== 'connected') {
          await this.checkConnection();
          if (this.status !== 'connected') {
            throw new Error('Not connected to Ollama');
          }
        }

        return await fn();
      } catch (error) {
        lastError = error;

        if (this.isConnectionError(error)) {
          logger.warn(`[ConnectionManager] Request failed (attempt ${attempt}/${maxAttempts}): ${error.message}`);

          if (attempt < maxAttempts) {
            const delay = this.calculateBackoff();
            await new Promise(resolve => setTimeout(resolve, delay));
            await this.checkConnection();
          }
        } else {
          // Not a connection error, don't retry
          throw error;
        }
      }
    }

    throw lastError;
  }
}

// Export singleton
export const connectionManager = new OllamaConnectionManager();
export default connectionManager;
