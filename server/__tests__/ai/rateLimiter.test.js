import { RateLimiter, RateLimitError } from '../../ai/rateLimiter.js';

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    // Create a new limiter for each test with small values for faster testing
    limiter = new RateLimiter({
      maxTokens: 3,
      refillRate: 10, // Fast refill for tests
      maxQueueSize: 5,
      requestTimeout: 1000,
      enabled: true,
    });
  });

  afterEach(() => {
    if (limiter) {
      limiter.stop();
    }
  });

  describe('acquire', () => {
    test('allows request when tokens available', async () => {
      const result = await limiter.acquire();
      expect(result.acquired).toBe(true);
      expect(result.waitTime).toBe(0);
    });

    test('consumes token on acquire', async () => {
      const statusBefore = limiter.getStatus();
      expect(statusBefore.availableTokens).toBe(3);

      await limiter.acquire();

      const statusAfter = limiter.getStatus();
      expect(statusAfter.availableTokens).toBe(2);
    });

    test('allows burst up to maxTokens', async () => {
      // Should be able to make 3 requests immediately
      const results = await Promise.all([
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
      ]);

      expect(results.every((r) => r.acquired)).toBe(true);
      expect(limiter.getStatus().availableTokens).toBe(0);
    });

    test('queues request when no tokens available', async () => {
      // Exhaust tokens
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      // This should queue
      const acquirePromise = limiter.acquire().catch(() => ({ queued: true }));
      expect(limiter.getStatus().queueLength).toBe(1);

      // Wait a bit for token refill
      await new Promise((r) => setTimeout(r, 200));

      // Check that it got dequeued or clean up
      if (limiter.getStatus().queueLength > 0) {
        limiter.stop();
        limiter = null;
      }
    });

    test('allows immediate requests when disabled', async () => {
      limiter.configure({ enabled: false });

      // Even with no tokens, should succeed immediately
      limiter.tokens = 0;

      const result = await limiter.acquire();
      expect(result.acquired).toBe(true);
      expect(result.waitTime).toBe(0);
    });

    test('rejects when queue is full', async () => {
      // Create limiter with small queue
      limiter.stop();
      limiter = new RateLimiter({
        maxTokens: 1,
        refillRate: 0.1, // Very slow refill
        maxQueueSize: 2,
        requestTimeout: 5000,
        enabled: true,
      });

      // Exhaust token
      await limiter.acquire();

      // Fill queue - catch rejections that happen on stop
      const queued1 = limiter.acquire().catch(() => {});
      const queued2 = limiter.acquire().catch(() => {});

      // This should be rejected because queue is full
      await expect(limiter.acquire()).rejects.toThrow(RateLimitError);

      // Clean up queued promises
      limiter.stop();
      limiter = null;
    });

    test('handles high priority requests', async () => {
      // Exhaust tokens
      limiter.tokens = 0;

      // Queue normal priority first - catch rejection when cleanup happens
      limiter.acquire('normal').catch(() => {});

      // Queue high priority
      limiter.acquire('high').catch(() => {});

      // High priority should be first in queue
      const status = limiter.getStatus();
      expect(status.queueLength).toBe(2);

      // Clean up
      limiter.stop();
      limiter = null;
    });
  });

  describe('execute', () => {
    test('executes function with rate limiting', async () => {
      let executed = false;
      const result = await limiter.execute(async () => {
        executed = true;
        return 'success';
      });

      expect(executed).toBe(true);
      expect(result).toBe('success');
    });

    test('consumes token for execute', async () => {
      const statusBefore = limiter.getStatus();
      await limiter.execute(async () => 'test');
      const statusAfter = limiter.getStatus();

      expect(statusAfter.availableTokens).toBe(statusBefore.availableTokens - 1);
    });
  });

  describe('token refill', () => {
    test('refills tokens over time', async () => {
      // Exhaust all tokens
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getStatus().availableTokens).toBe(0);

      // Wait for refill interval to fire (1 second interval)
      // At 10 tokens/sec refill rate, after 1 second we should have tokens
      await new Promise((r) => setTimeout(r, 1100));

      const tokens = limiter.getStatus().availableTokens;
      expect(tokens).toBeGreaterThan(0);
    });

    test('does not exceed maxTokens', async () => {
      // Wait for potential over-refill
      await new Promise((r) => setTimeout(r, 1100));

      expect(limiter.getStatus().availableTokens).toBeLessThanOrEqual(3);
    });
  });

  describe('getStatus', () => {
    test('returns correct status', () => {
      const status = limiter.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('availableTokens');
      expect(status).toHaveProperty('maxTokens');
      expect(status).toHaveProperty('refillRate');
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('maxQueueSize');
      expect(status).toHaveProperty('estimatedWaitTime');
      expect(status).toHaveProperty('stats');
    });

    test('tracks statistics', async () => {
      await limiter.acquire();
      await limiter.acquire();

      const status = limiter.getStatus();
      expect(status.stats.totalRequests).toBe(2);
      expect(status.stats.acceptedRequests).toBe(2);
    });
  });

  describe('configure', () => {
    test('updates configuration', () => {
      limiter.configure({
        maxTokens: 20,
        refillRate: 5,
        enabled: false,
      });

      const status = limiter.getStatus();
      expect(status.maxTokens).toBe(20);
      expect(status.refillRate).toBe(5);
      expect(status.enabled).toBe(false);
    });

    test('clamps tokens to new maxTokens', () => {
      // Start with 3 tokens
      expect(limiter.getStatus().availableTokens).toBe(3);

      // Reduce maxTokens
      limiter.configure({ maxTokens: 1 });

      expect(limiter.getStatus().availableTokens).toBeLessThanOrEqual(1);
    });
  });

  describe('events', () => {
    test('emits queued event', async () => {
      let queuedEvent = null;
      limiter.on('queued', (data) => {
        queuedEvent = data;
      });

      // Exhaust tokens
      limiter.tokens = 0;

      // This will queue and emit event
      const acquirePromise = limiter.acquire().catch(() => {});

      // Give time for event to fire
      await new Promise((r) => setTimeout(r, 50));

      expect(queuedEvent).not.toBeNull();
      expect(queuedEvent).toHaveProperty('queueSize');
      expect(queuedEvent).toHaveProperty('priority');

      limiter.stop();
      limiter = null;
    });

    test('emits configured event synchronously', () => {
      let configuredEvent = null;
      limiter.on('configured', (data) => {
        configuredEvent = data;
      });

      limiter.configure({ maxTokens: 10 });

      expect(configuredEvent).not.toBeNull();
      expect(configuredEvent.maxTokens).toBe(10);
    });
  });

  describe('stop', () => {
    test('clears interval on stop', () => {
      expect(limiter.refillInterval).not.toBeNull();
      limiter.stop();
      expect(limiter.refillInterval).toBeNull();
    });

    test('rejects queued requests on stop', async () => {
      // Exhaust tokens
      limiter.tokens = 0;

      // Queue a request
      const acquirePromise = limiter.acquire().catch((err) => {
        expect(err.message).toBe('Rate limiter stopped');
        return { rejected: true };
      });

      // Stop limiter
      limiter.stop();

      const result = await acquirePromise;
      expect(result.rejected).toBe(true);
    });
  });

  describe('estimateWaitTime', () => {
    test('returns 0 when queue is empty', () => {
      expect(limiter.estimateWaitTime()).toBe(0);
    });

    test('estimates based on queue length and refill rate', async () => {
      // Exhaust tokens and queue requests
      limiter.tokens = 0;

      // Capture the promises so they can be cleaned up
      const p1 = limiter.acquire().catch(() => {});
      const p2 = limiter.acquire().catch(() => {});

      const estimate = limiter.estimateWaitTime();
      // With queue of 2 + 1 current, refill rate of 10, should be ~300ms
      expect(estimate).toBeGreaterThan(0);

      // Stop to clean up
      limiter.stop();
      limiter = null;
    });
  });
});

describe('RateLimitError', () => {
  test('has correct properties', () => {
    const error = new RateLimitError('Test error', {
      retryAfter: 1000,
      queueSize: 5,
    });

    expect(error.name).toBe('RateLimitError');
    expect(error.message).toBe('Test error');
    expect(error.retryAfter).toBe(1000);
    expect(error.queueSize).toBe(5);
  });
});
