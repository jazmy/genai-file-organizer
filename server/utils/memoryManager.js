import { EventEmitter } from 'events';
import logger from './logger.js';

/**
 * Memory Manager for monitoring and managing memory usage
 *
 * Features:
 * - Periodic memory monitoring
 * - Automatic garbage collection hints
 * - Memory threshold alerts
 * - Cleanup tracking for event listeners
 */
export class MemoryManager extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.checkIntervalMs = options.checkIntervalMs ?? 30000; // Check every 30 seconds
    this.warnThresholdMB = options.warnThresholdMB ?? 500;   // Warn at 500MB
    this.criticalThresholdMB = options.criticalThresholdMB ?? 800; // Critical at 800MB
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? 300000; // Cleanup every 5 minutes
    this.maxListenerWarning = options.maxListenerWarning ?? 10;

    // State
    this.monitorInterval = null;
    this.cleanupInterval = null;
    this.isMonitoring = false;
    this.history = [];
    this.maxHistorySize = 100;
    this.listenerRegistry = new Map(); // Track event listener registrations
    this.cleanupCallbacks = [];

    // Statistics
    this.stats = {
      peakMemoryMB: 0,
      gcHints: 0,
      warningCount: 0,
      criticalCount: 0,
      cleanupRuns: 0,
      lastCleanup: null,
    };
  }

  /**
   * Start memory monitoring
   */
  start() {
    if (this.isMonitoring) {
      logger.warn('[MemoryManager] Already monitoring');
      return;
    }

    logger.info('[MemoryManager] Starting memory monitoring');
    this.isMonitoring = true;

    // Initial check
    this.checkMemory();

    // Set up periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, this.checkIntervalMs);

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.cleanupIntervalMs);

    this.emit('started');
    return this;
  }

  /**
   * Stop memory monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('[MemoryManager] Stopping memory monitoring');

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isMonitoring = false;
    this.emit('stopped');
  }

  /**
   * Check current memory usage
   */
  checkMemory() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const externalMB = Math.round((memUsage.external || 0) / 1024 / 1024);

    // Update peak memory
    if (heapUsedMB > this.stats.peakMemoryMB) {
      this.stats.peakMemoryMB = heapUsedMB;
    }

    // Create snapshot
    const snapshot = {
      timestamp: new Date().toISOString(),
      heapUsedMB,
      heapTotalMB,
      rssMB,
      externalMB,
      heapUsedPercent: Math.round((heapUsedMB / heapTotalMB) * 100),
    };

    // Add to history
    this.history.push(snapshot);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Check thresholds
    if (heapUsedMB >= this.criticalThresholdMB) {
      this.stats.criticalCount++;
      logger.error(`[MemoryManager] CRITICAL: Memory usage ${heapUsedMB}MB exceeds ${this.criticalThresholdMB}MB threshold`);
      this.emit('critical', snapshot);
      this.requestGC();
    } else if (heapUsedMB >= this.warnThresholdMB) {
      this.stats.warningCount++;
      logger.warn(`[MemoryManager] WARNING: Memory usage ${heapUsedMB}MB exceeds ${this.warnThresholdMB}MB threshold`);
      this.emit('warning', snapshot);
    }

    this.emit('check', snapshot);
    return snapshot;
  }

  /**
   * Request garbage collection (if available)
   */
  requestGC() {
    if (global.gc) {
      logger.info('[MemoryManager] Requesting garbage collection');
      global.gc();
      this.stats.gcHints++;
      this.emit('gc');
    } else {
      logger.debug('[MemoryManager] GC not available (run with --expose-gc to enable)');
    }
  }

  /**
   * Run cleanup tasks
   */
  runCleanup() {
    logger.debug('[MemoryManager] Running cleanup');
    this.stats.cleanupRuns++;
    this.stats.lastCleanup = new Date().toISOString();

    // Run registered cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        logger.error(`[MemoryManager] Cleanup callback error: ${error.message}`);
      }
    }

    // Request GC after cleanup
    this.requestGC();

    this.emit('cleanup', { timestamp: this.stats.lastCleanup });
  }

  /**
   * Register a cleanup callback
   */
  registerCleanup(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.push(callback);
      return () => {
        const index = this.cleanupCallbacks.indexOf(callback);
        if (index > -1) {
          this.cleanupCallbacks.splice(index, 1);
        }
      };
    }
    return () => {};
  }

  /**
   * Track event listener registrations
   */
  trackEventEmitter(name, emitter) {
    const initialCount = emitter.listenerCount ?
      Object.keys(emitter._events || {}).reduce((sum, evt) => sum + emitter.listenerCount(evt), 0) : 0;

    this.listenerRegistry.set(name, {
      emitter,
      initialCount,
      registered: new Date().toISOString(),
    });

    // Warn if emitter has many listeners
    if (initialCount > this.maxListenerWarning) {
      logger.warn(`[MemoryManager] EventEmitter '${name}' has ${initialCount} listeners`);
    }
  }

  /**
   * Check for listener leaks
   */
  checkListenerLeaks() {
    const leaks = [];

    for (const [name, { emitter, initialCount }] of this.listenerRegistry) {
      if (!emitter._events) continue;

      const currentCount = Object.keys(emitter._events).reduce(
        (sum, evt) => sum + emitter.listenerCount(evt), 0
      );

      if (currentCount > initialCount + this.maxListenerWarning) {
        leaks.push({
          name,
          initialCount,
          currentCount,
          increase: currentCount - initialCount,
        });
      }
    }

    if (leaks.length > 0) {
      logger.warn(`[MemoryManager] Potential listener leaks detected:`, leaks);
      this.emit('listenerLeak', leaks);
    }

    return leaks;
  }

  /**
   * Get current memory status
   */
  getStatus() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    return {
      isMonitoring: this.isMonitoring,
      current: {
        heapUsedMB,
        heapTotalMB,
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round((memUsage.external || 0) / 1024 / 1024),
        heapUsedPercent: Math.round((heapUsedMB / heapTotalMB) * 100),
      },
      thresholds: {
        warnMB: this.warnThresholdMB,
        criticalMB: this.criticalThresholdMB,
      },
      stats: { ...this.stats },
      recentHistory: this.history.slice(-10),
      trackedEmitters: this.listenerRegistry.size,
      registeredCleanups: this.cleanupCallbacks.length,
    };
  }

  /**
   * Get memory trend (average over recent history)
   */
  getMemoryTrend() {
    if (this.history.length < 2) {
      return { trend: 'stable', change: 0 };
    }

    const recent = this.history.slice(-10);
    const older = this.history.slice(-20, -10);

    if (older.length === 0) {
      return { trend: 'stable', change: 0 };
    }

    const recentAvg = recent.reduce((sum, s) => sum + s.heapUsedMB, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.heapUsedMB, 0) / older.length;

    const change = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);

    let trend = 'stable';
    if (change > 10) {
      trend = 'increasing';
    } else if (change < -10) {
      trend = 'decreasing';
    }

    return {
      trend,
      change,
      recentAvgMB: Math.round(recentAvg),
      olderAvgMB: Math.round(olderAvg),
    };
  }

  /**
   * Force cleanup and GC
   */
  forceCleanup() {
    logger.info('[MemoryManager] Forcing cleanup');
    this.runCleanup();
    return this.checkMemory();
  }

  /**
   * Update configuration
   */
  configure(options) {
    if (options.warnThresholdMB !== undefined) {
      this.warnThresholdMB = options.warnThresholdMB;
    }
    if (options.criticalThresholdMB !== undefined) {
      this.criticalThresholdMB = options.criticalThresholdMB;
    }
    if (options.checkIntervalMs !== undefined) {
      this.checkIntervalMs = options.checkIntervalMs;
      if (this.isMonitoring && this.monitorInterval) {
        clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => this.checkMemory(), this.checkIntervalMs);
      }
    }
    if (options.cleanupIntervalMs !== undefined) {
      this.cleanupIntervalMs = options.cleanupIntervalMs;
      if (this.isMonitoring && this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = setInterval(() => this.runCleanup(), this.cleanupIntervalMs);
      }
    }

    logger.info(`[MemoryManager] Configuration updated`);
    this.emit('configured', this.getStatus());
  }
}

// Create singleton instance
export const memoryManager = new MemoryManager();

export default {
  MemoryManager,
  memoryManager,
};
