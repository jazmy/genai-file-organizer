import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

/**
 * Token Bucket Rate Limiter for AI requests
 *
 * Implements a token bucket algorithm that allows bursting while
 * maintaining an average rate limit over time.
 */
export class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration with defaults
    this.maxTokens = options.maxTokens ?? 10;           // Max burst capacity
    this.refillRate = options.refillRate ?? 2;          // Tokens per second
    this.maxQueueSize = options.maxQueueSize ?? 100;    // Max queued requests
    this.requestTimeout = options.requestTimeout ?? 60000; // Queue timeout (1 min)

    // State
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
    this.isEnabled = options.enabled ?? true;

    // Statistics
    this.stats = {
      totalRequests: 0,
      acceptedRequests: 0,
      queuedRequests: 0,
      rejectedRequests: 0,
      timedOutRequests: 0,
      avgWaitTime: 0,
      totalWaitTime: 0,
    };

    // Start refill interval
    this.refillInterval = setInterval(() => this.refillTokens(), 1000);

    logger.info(`[RateLimiter] Initialized: ${this.maxTokens} tokens, ${this.refillRate}/sec refill`);
  }

  /**
   * Refill tokens based on elapsed time
   */
  refillTokens() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;

    // Process queue if we have tokens
    if (this.tokens >= 1 && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Acquire a token for making a request
   * Returns a promise that resolves when a token is available
   */
  async acquire(priority = 'normal') {
    this.stats.totalRequests++;

    // If rate limiting is disabled, allow immediately
    if (!this.isEnabled) {
      this.stats.acceptedRequests++;
      return { acquired: true, waitTime: 0 };
    }

    // Try to consume a token immediately
    if (this.tokens >= 1) {
      this.tokens--;
      this.stats.acceptedRequests++;
      return { acquired: true, waitTime: 0 };
    }

    // Check queue capacity
    if (this.queue.length >= this.maxQueueSize) {
      this.stats.rejectedRequests++;
      this.emit('rejected', { reason: 'queue_full', queueSize: this.queue.length });
      throw new RateLimitError('Rate limit queue full', {
        retryAfter: this.estimateWaitTime(),
        queueSize: this.queue.length,
      });
    }

    // Queue the request
    return this.enqueue(priority);
  }

  /**
   * Add request to queue and wait for token
   */
  enqueue(priority) {
    return new Promise((resolve, reject) => {
      const queuedAt = Date.now();

      const queueItem = {
        priority,
        queuedAt,
        resolve: (result) => {
          const waitTime = Date.now() - queuedAt;
          this.stats.totalWaitTime += waitTime;
          this.stats.avgWaitTime = this.stats.totalWaitTime / this.stats.acceptedRequests;
          resolve({ ...result, waitTime });
        },
        reject,
        timeout: setTimeout(() => {
          this.removeFromQueue(queueItem);
          this.stats.timedOutRequests++;
          this.emit('timeout', { queuedAt, waitTime: Date.now() - queuedAt });
          reject(new RateLimitError('Request timed out in queue', {
            waitTime: Date.now() - queuedAt,
          }));
        }, this.requestTimeout),
      };

      // Insert based on priority
      if (priority === 'high') {
        // Insert at beginning (after other high priority items)
        const insertIndex = this.queue.findIndex(item => item.priority !== 'high');
        if (insertIndex === -1) {
          this.queue.push(queueItem);
        } else {
          this.queue.splice(insertIndex, 0, queueItem);
        }
      } else {
        this.queue.push(queueItem);
      }

      this.stats.queuedRequests++;
      this.emit('queued', { queueSize: this.queue.length, priority });

      logger.debug(`[RateLimiter] Request queued (${this.queue.length} in queue)`);

      // Try to process immediately if we have tokens
      this.processQueue();
    });
  }

  /**
   * Process queued requests when tokens are available
   */
  processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.tokens >= 1 && this.queue.length > 0) {
      const item = this.queue.shift();
      clearTimeout(item.timeout);
      this.tokens--;
      this.stats.acceptedRequests++;

      item.resolve({ acquired: true });
      this.emit('dequeued', { queueSize: this.queue.length });

      logger.debug(`[RateLimiter] Request dequeued (${this.queue.length} remaining)`);
    }

    this.processing = false;
  }

  /**
   * Remove item from queue
   */
  removeFromQueue(item) {
    const index = this.queue.indexOf(item);
    if (index > -1) {
      this.queue.splice(index, 1);
      clearTimeout(item.timeout);
    }
  }

  /**
   * Estimate wait time based on queue length and refill rate
   */
  estimateWaitTime() {
    if (this.queue.length === 0) {
      return 0;
    }
    // Time to process queue + current request
    return Math.ceil((this.queue.length + 1) / this.refillRate) * 1000;
  }

  /**
   * Execute a function with rate limiting
   */
  async execute(fn, options = {}) {
    const { priority = 'normal' } = options;

    await this.acquire(priority);

    try {
      return await fn();
    } finally {
      // Token is already consumed, nothing to release
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      queueLength: this.queue.length,
      maxQueueSize: this.maxQueueSize,
      estimatedWaitTime: this.estimateWaitTime(),
      stats: { ...this.stats },
    };
  }

  /**
   * Update rate limiter configuration
   */
  configure(options) {
    if (options.maxTokens !== undefined) {
      this.maxTokens = options.maxTokens;
      // Don't exceed new max
      this.tokens = Math.min(this.tokens, this.maxTokens);
    }
    if (options.refillRate !== undefined) {
      this.refillRate = options.refillRate;
    }
    if (options.maxQueueSize !== undefined) {
      this.maxQueueSize = options.maxQueueSize;
    }
    if (options.requestTimeout !== undefined) {
      this.requestTimeout = options.requestTimeout;
    }
    if (options.enabled !== undefined) {
      this.isEnabled = options.enabled;
    }

    logger.info(`[RateLimiter] Configuration updated: ${JSON.stringify(this.getStatus())}`);
    this.emit('configured', this.getStatus());
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      acceptedRequests: 0,
      queuedRequests: 0,
      rejectedRequests: 0,
      timedOutRequests: 0,
      avgWaitTime: 0,
      totalWaitTime: 0,
    };
  }

  /**
   * Stop the rate limiter
   */
  stop() {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
      this.refillInterval = null;
    }

    // Reject all queued requests
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      clearTimeout(item.timeout);
      item.reject(new RateLimitError('Rate limiter stopped'));
    }

    logger.info('[RateLimiter] Stopped');
  }
}

/**
 * Custom error for rate limit issues
 */
export class RateLimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = details.retryAfter;
    this.queueSize = details.queueSize;
    this.waitTime = details.waitTime;
  }
}

// Create singleton instance with default configuration
export const rateLimiter = new RateLimiter({
  maxTokens: 10,      // Allow burst of 10 requests
  refillRate: 2,      // 2 requests per second sustained
  maxQueueSize: 100,  // Max 100 requests in queue
  requestTimeout: 60000, // 1 minute timeout in queue
  enabled: true,
});

export default {
  RateLimiter,
  RateLimitError,
  rateLimiter,
};
