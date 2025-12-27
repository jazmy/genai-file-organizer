import { EventEmitter } from 'events';
import { dbOperations } from '../db/database.js';
import { processFile } from './processor.js';
import logger from '../utils/logger.js';
import { metricsService } from '../services/metricsService.js';

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 3;
    this.activeJobs = 0;
    this.isRunning = false;
    this.currentBatchId = null;
  }

  async createBatch(filePaths, options = {}) {
    const { priority = 0 } = options;
    const batchId = dbOperations.createBatch(filePaths, priority);
    this.currentBatchId = batchId;

    // Update queue metrics
    metricsService.updateQueueMetrics(filePaths.length, null);

    this.emit('batch:created', { batchId, total: filePaths.length });

    return batchId;
  }

  async start() {
    if (this.isRunning) {
      logger.info('Queue already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting queue processor (concurrency: ${this.concurrency})`);
    this.emit('queue:started');

    await this.processQueue();
  }

  stop() {
    this.isRunning = false;
    logger.info('Queue processor stopped');
    this.emit('queue:stopped');
  }

  async processQueue() {
    while (this.isRunning) {
      // Fill up to concurrency limit
      while (this.activeJobs < this.concurrency && this.isRunning) {
        const job = dbOperations.getNextJob();
        
        if (!job) {
          // No more jobs
          if (this.activeJobs === 0) {
            this.isRunning = false;
            this.emit('queue:empty');
            logger.info('Queue empty, stopping processor');
            return;
          }
          break;
        }

        this.activeJobs++;
        this.processJob(job).finally(() => {
          this.activeJobs--;
        });
      }

      // Wait a bit before checking for more jobs
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async processJob(job) {
    const { id, batch_id, file_path } = job;
    
    logger.info(`[QUEUE] Processing job ${id}: ${file_path}`);
    dbOperations.updateJobStatus(id, 'processing');
    this.emit('job:started', { jobId: id, batchId: batch_id, filePath: file_path });

    try {
      // Process the file (dry run to get suggested name)
      const result = await processFile(file_path, { dryRun: true });

      if (result.success) {
        // Save to database
        dbOperations.saveProcessedFile(
          file_path,
          result.originalName,
          result.suggestedName,
          null, // newPath is null until applied
          result.category,
          'previewed'
        );

        dbOperations.updateJobStatus(id, 'completed');
        this.emit('job:completed', { 
          jobId: id, 
          batchId: batch_id, 
          filePath: file_path,
          result 
        });

        logger.info(`[QUEUE] Job ${id} completed: ${result.originalName} -> ${result.suggestedName}`);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      logger.error(`[QUEUE] Job ${id} failed: ${error.message}`);
      dbOperations.updateJobStatus(id, 'failed', error.message);
      
      // Save failed attempt to database
      dbOperations.saveProcessedFile(
        file_path,
        file_path.split('/').pop(),
        null,
        null,
        null,
        'failed',
        error.message
      );

      this.emit('job:failed', { 
        jobId: id, 
        batchId: batch_id, 
        filePath: file_path, 
        error: error.message 
      });
    }

    // Emit batch progress and update metrics
    if (batch_id) {
      const stats = dbOperations.getBatchStats(batch_id);
      // Update queue metrics with current pending and completed counts
      metricsService.updateQueueMetrics(stats.pending || 0, stats.completed || 0);
      this.emit('batch:progress', stats);
    }
  }

  getBatchStats(batchId) {
    return dbOperations.getBatchStats(batchId || this.currentBatchId);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs,
      concurrency: this.concurrency,
      currentBatchId: this.currentBatchId,
    };
  }
}

// Singleton instance
export const jobQueue = new JobQueue({ concurrency: 3 });

export default jobQueue;
