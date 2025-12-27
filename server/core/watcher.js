import chokidar from 'chokidar';
import { join, basename } from 'path';
import { stat, access, constants } from 'fs/promises';
import { isSupported, moveFile } from '../utils/fileUtils.js';
import { organizeFile } from './organizer.js';
import { loadConfig } from '../config/default.js';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

const config = loadConfig();

// Default stability configuration
const DEFAULT_STABILITY = {
  threshold: 2000,        // Wait 2 seconds for file to stabilize
  pollInterval: 100,      // Check every 100ms
  debounceMs: 500,        // Debounce rapid changes
  maxRetries: 3,          // Max retries for locked files
  retryDelay: 1000,       // Delay between retries
  sizeCheckDelay: 500,    // Delay before verifying size stability
};

export class FileWatcher extends EventEmitter {
  constructor(options = {}) {
    super();

    this.directories = options.directories || config.watch.directories;
    this.processedFolder = options.processedFolder || config.watch.processedFolder;
    this.ignorePatterns = options.ignorePatterns || config.watch.ignorePatterns;
    this.dryRun = options.dryRun ?? config.processing.dryRun;
    this.autoMove = options.autoMove ?? config.folders.enabled;
    this.stability = { ...DEFAULT_STABILITY, ...options.stability };

    this.watcher = null;
    this.queue = [];
    this.processing = false;
    this.isRunning = false;

    // Debounce tracking
    this.pendingFiles = new Map(); // Map<filePath, { timeout, lastSize, changeCount }>
    this.recentlyProcessed = new Set(); // Files processed recently (to avoid duplicates)
    this.cleanupInterval = null;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Watcher is already running');
      return;
    }

    if (this.directories.length === 0) {
      throw new Error('No directories configured for watching');
    }

    logger.info(`Starting file watcher for: ${this.directories.join(', ')}`);

    this.watcher = chokidar.watch(this.directories, {
      ignored: this.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.stability.threshold,
        pollInterval: this.stability.pollInterval,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent(filePath, 'add'))
      .on('change', (filePath) => this.handleFileEvent(filePath, 'change'))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => {
        this.isRunning = true;
        logger.info('File watcher ready');
        this.emit('ready');
      });

    // Start cleanup interval for recently processed files
    this.cleanupInterval = setInterval(() => {
      this.cleanupRecentlyProcessed();
    }, 60000); // Clean up every minute

    return this;
  }

  cleanupRecentlyProcessed() {
    // Clear the recently processed set periodically
    // This prevents memory leaks and allows re-processing after some time
    if (this.recentlyProcessed.size > 100) {
      this.recentlyProcessed.clear();
      logger.debug('[Watcher] Cleared recently processed cache');
    }
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping file watcher');

    // Clear pending debounce timers
    for (const [_, pending] of this.pendingFiles) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
    }
    this.pendingFiles.clear();

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Handle file events with debouncing
   */
  handleFileEvent(filePath, eventType) {
    const fileName = basename(filePath);

    // Skip if recently processed (prevents duplicates from rapid events)
    if (this.recentlyProcessed.has(filePath)) {
      logger.debug(`[Watcher] Skipping recently processed: ${fileName}`);
      return;
    }

    // Check if already pending
    const existing = this.pendingFiles.get(filePath);
    if (existing) {
      // Clear existing timeout and update
      clearTimeout(existing.timeout);
      existing.changeCount++;
      logger.debug(`[Watcher] File changed again (${existing.changeCount}): ${fileName}`);
    } else {
      // New file event
      this.pendingFiles.set(filePath, {
        timeout: null,
        lastSize: null,
        changeCount: 1,
        eventType,
      });
    }

    // Set debounce timeout
    const pending = this.pendingFiles.get(filePath);
    pending.timeout = setTimeout(async () => {
      await this.processStableFile(filePath);
    }, this.stability.debounceMs);
  }

  /**
   * Process a file after it has stabilized
   */
  async processStableFile(filePath) {
    const fileName = basename(filePath);
    const pending = this.pendingFiles.get(filePath);

    try {
      // Verify file still exists and is readable
      if (!await this.isFileAccessible(filePath)) {
        logger.debug(`[Watcher] File no longer accessible: ${fileName}`);
        this.pendingFiles.delete(filePath);
        return;
      }

      // Get current size
      const fileStats = await stat(filePath);
      const currentSize = fileStats.size;

      // Check if size has stabilized
      if (pending.lastSize !== null && pending.lastSize !== currentSize) {
        // Size still changing, wait more
        logger.debug(`[Watcher] File size still changing: ${fileName}`);
        pending.lastSize = currentSize;
        pending.timeout = setTimeout(async () => {
          await this.processStableFile(filePath);
        }, this.stability.sizeCheckDelay);
        return;
      }

      if (pending.lastSize === null) {
        // First size check, wait and verify
        pending.lastSize = currentSize;
        pending.timeout = setTimeout(async () => {
          await this.processStableFile(filePath);
        }, this.stability.sizeCheckDelay);
        return;
      }

      // File is stable, proceed with processing
      this.pendingFiles.delete(filePath);
      await this.handleNewFile(filePath);

    } catch (error) {
      logger.error(`[Watcher] Error checking file stability: ${error.message}`);
      this.pendingFiles.delete(filePath);
    }
  }

  /**
   * Check if file is accessible (not locked)
   */
  async isFileAccessible(filePath, retryCount = 0) {
    try {
      await access(filePath, constants.R_OK);
      return true;
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        // File is locked
        if (retryCount < this.stability.maxRetries) {
          logger.debug(`[Watcher] File locked, retrying (${retryCount + 1}/${this.stability.maxRetries})`);
          await delay(this.stability.retryDelay);
          return this.isFileAccessible(filePath, retryCount + 1);
        }
        logger.warn(`[Watcher] File still locked after ${this.stability.maxRetries} retries: ${basename(filePath)}`);
      }
      return false;
    }
  }

  async handleNewFile(filePath) {
    const fileName = basename(filePath);

    if (!isSupported(filePath)) {
      logger.debug(`Ignoring unsupported file: ${fileName}`);
      return;
    }

    logger.info(`New file detected: ${fileName}`);
    this.emit('fileDetected', { filePath, fileName });

    this.queue.push(filePath);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const filePath = this.queue.shift();
      const fileName = basename(filePath);

      try {
        this.emit('processingStart', { filePath, fileName });

        const result = await organizeFile(filePath, {
          dryRun: this.dryRun,
          autoMove: this.autoMove,
        });

        if (result.success) {
          // Mark as recently processed to prevent duplicate processing
          this.recentlyProcessed.add(filePath);
          if (result.newPath) {
            this.recentlyProcessed.add(result.newPath);
          }

          this.emit('processingComplete', {
            filePath,
            fileName,
            result,
          });

          if (this.processedFolder && !this.dryRun && result.newPath) {
            const destPath = join(this.processedFolder, basename(result.newPath));
            await moveFile(result.newPath, destPath, { createDir: true });
            logger.info(`Moved to processed folder: ${basename(destPath)}`);
          }
        } else {
          this.emit('processingFailed', {
            filePath,
            fileName,
            error: result.error,
          });
        }
      } catch (error) {
        logger.error(`Error processing ${fileName}: ${error.message}`);
        this.emit('processingError', {
          filePath,
          fileName,
          error: error.message,
        });
      }

      if (this.queue.length > 0) {
        await delay(config.processing.delayBetweenFiles);
      }
    }

    this.processing = false;
  }

  handleError(error) {
    logger.error(`Watcher error: ${error.message}`);
    this.emit('error', error);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      directories: this.directories,
      queueLength: this.queue.length,
      processing: this.processing,
      pendingFiles: this.pendingFiles.size,
      recentlyProcessed: this.recentlyProcessed.size,
      stability: this.stability,
    };
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createWatcher(options = {}) {
  return new FileWatcher(options);
}

export default {
  FileWatcher,
  createWatcher,
};
