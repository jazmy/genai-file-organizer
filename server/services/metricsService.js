/**
 * Metrics Service - Collects and provides performance metrics
 */

class MetricsService {
  constructor() {
    this.metrics = {
      // Processing metrics
      filesProcessed: 0,
      filesSucceeded: 0,
      filesFailed: 0,
      totalProcessingTime: 0,
      processingTimes: [], // Rolling window of last 100 processing times

      // API metrics
      apiRequests: 0,
      apiErrors: 0,
      apiResponseTimes: [], // Rolling window of last 100 response times

      // Queue metrics
      queuedJobs: 0,
      completedJobs: 0,

      // Session info
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    this.maxRollingWindow = 100;
    this.hourlyStats = [];
    this.maxHourlyStats = 24; // Keep 24 hours of hourly stats

    // Record hourly stats every hour
    this.hourlyInterval = setInterval(() => this.recordHourlyStat(), 60 * 60 * 1000);
  }

  /**
   * Record a file processing event
   */
  recordProcessing(success, processingTimeMs) {
    this.metrics.filesProcessed++;
    this.metrics.lastActivity = Date.now();

    if (success) {
      this.metrics.filesSucceeded++;
    } else {
      this.metrics.filesFailed++;
    }

    if (typeof processingTimeMs === 'number') {
      this.metrics.totalProcessingTime += processingTimeMs;
      this.metrics.processingTimes.push(processingTimeMs);

      // Keep rolling window
      if (this.metrics.processingTimes.length > this.maxRollingWindow) {
        this.metrics.processingTimes.shift();
      }
    }
  }

  /**
   * Record an API request
   */
  recordApiRequest(responseTimeMs, isError = false) {
    this.metrics.apiRequests++;
    this.metrics.lastActivity = Date.now();

    if (isError) {
      this.metrics.apiErrors++;
    }

    if (typeof responseTimeMs === 'number') {
      this.metrics.apiResponseTimes.push(responseTimeMs);

      // Keep rolling window
      if (this.metrics.apiResponseTimes.length > this.maxRollingWindow) {
        this.metrics.apiResponseTimes.shift();
      }
    }
  }

  /**
   * Update queue metrics
   */
  updateQueueMetrics(queued, completed) {
    if (typeof queued === 'number') {
      this.metrics.queuedJobs = queued;
    }
    if (typeof completed === 'number') {
      this.metrics.completedJobs = completed;
    }
  }

  /**
   * Record hourly statistics snapshot
   */
  recordHourlyStat() {
    const stat = {
      timestamp: Date.now(),
      filesProcessed: this.metrics.filesProcessed,
      filesSucceeded: this.metrics.filesSucceeded,
      filesFailed: this.metrics.filesFailed,
      apiRequests: this.metrics.apiRequests,
      apiErrors: this.metrics.apiErrors,
    };

    this.hourlyStats.push(stat);

    // Keep only last 24 hours
    if (this.hourlyStats.length > this.maxHourlyStats) {
      this.hourlyStats.shift();
    }
  }

  /**
   * Calculate average from array
   */
  calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate percentile from array
   */
  calculatePercentile(arr, percentile) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get memory metrics
   */
  getMemoryMetrics() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;

    // Calculate heap usage percentage
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Determine status based on heap usage
    let status = 'healthy';
    if (heapUsagePercent > 90) {
      status = 'critical';
    } else if (heapUsagePercent > 70) {
      status = 'warning';
    }

    // Track memory history for trend analysis
    if (!this.memoryHistory) {
      this.memoryHistory = [];
    }

    this.memoryHistory.push({
      timestamp: Date.now(),
      heapUsedMB,
    });

    // Keep only last 10 samples
    if (this.memoryHistory.length > 10) {
      this.memoryHistory.shift();
    }

    // Calculate trend
    let direction = 'stable';
    let changePercent = 0;

    if (this.memoryHistory.length >= 2) {
      const oldest = this.memoryHistory[0].heapUsedMB;
      const newest = this.memoryHistory[this.memoryHistory.length - 1].heapUsedMB;
      changePercent = ((newest - oldest) / oldest) * 100;

      if (changePercent > 5) {
        direction = 'increasing';
      } else if (changePercent < -5) {
        direction = 'decreasing';
      }
    }

    return {
      current: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
        externalMB: memUsage.external / 1024 / 1024,
      },
      status,
      trend: {
        direction,
        changePercent,
      },
    };
  }

  /**
   * Get current metrics summary
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const successRate = this.metrics.filesProcessed > 0
      ? (this.metrics.filesSucceeded / this.metrics.filesProcessed) * 100
      : 0;

    const avgProcessingTime = this.calculateAverage(this.metrics.processingTimes);
    const p95ProcessingTime = this.calculatePercentile(this.metrics.processingTimes, 95);

    const avgResponseTime = this.calculateAverage(this.metrics.apiResponseTimes);
    const p95ResponseTime = this.calculatePercentile(this.metrics.apiResponseTimes, 95);

    const apiErrorRate = this.metrics.apiRequests > 0
      ? (this.metrics.apiErrors / this.metrics.apiRequests) * 100
      : 0;

    return {
      processing: {
        total: this.metrics.filesProcessed,
        succeeded: this.metrics.filesSucceeded,
        failed: this.metrics.filesFailed,
        successRate: Math.round(successRate * 100) / 100,
        avgProcessingTimeMs: Math.round(avgProcessingTime),
        p95ProcessingTimeMs: Math.round(p95ProcessingTime),
      },
      api: {
        totalRequests: this.metrics.apiRequests,
        errors: this.metrics.apiErrors,
        errorRate: Math.round(apiErrorRate * 100) / 100,
        avgResponseTimeMs: Math.round(avgResponseTime),
        p95ResponseTimeMs: Math.round(p95ResponseTime),
      },
      queue: {
        pending: this.metrics.queuedJobs,
        completed: this.metrics.completedJobs,
      },
      memory: this.getMemoryMetrics(),
      system: {
        uptimeMs: uptime,
        uptimeFormatted: this.formatUptime(uptime),
        lastActivity: this.metrics.lastActivity,
        startTime: this.metrics.startTime,
      },
      hourlyStats: this.hourlyStats,
    };
  }

  /**
   * Format uptime to human readable string
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      filesProcessed: 0,
      filesSucceeded: 0,
      filesFailed: 0,
      totalProcessingTime: 0,
      processingTimes: [],
      apiRequests: 0,
      apiErrors: 0,
      apiResponseTimes: [],
      queuedJobs: 0,
      completedJobs: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
    };
    this.hourlyStats = [];
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    if (this.hourlyInterval) {
      clearInterval(this.hourlyInterval);
    }
  }
}

export const metricsService = new MetricsService();
