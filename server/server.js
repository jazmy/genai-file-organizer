import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname as pathDirname, join as pathJoin } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);
dotenv.config({ path: pathJoin(__dirname, '.env') });
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { resolve, join, basename, dirname } from 'path';
import { promises as fs } from 'fs';

import { organizeFile, organizeDirectory, getHistory, undoRename } from './core/organizer.js';
import { createWatcher } from './core/watcher.js';
import { testConnection, getConnectionStatus, onConnectionChange, getRateLimitStatus, configureRateLimit, onRateLimitEvent } from './ai/ollama.js';
import { getProviderType } from './ai/providers/index.js';
import { responseValidator } from './ai/responseValidator.js';
import { loadConfig, setDbConfigLoader, validateConfig } from './config/default.js';
import { listFiles, isSupported, getFileStats, fileExists } from './utils/fileUtils.js';
import logger from './utils/logger.js';
import { jobQueue } from './core/queue.js';
import { dbOperations } from './db/database.js';
import { loggerService } from './services/loggerService.js';
import { apiLoggerMiddleware } from './middleware/apiLogger.js';
import { migrationRunner } from './db/migrationRunner.js';
import { memoryManager } from './utils/memoryManager.js';
import { metricsService } from './services/metricsService.js';
import { apiVersioning, getApiInfo, API_VERSION } from './middleware/apiVersioning.js';
import { gracefulShutdown } from './utils/gracefulShutdown.js';

logger.info('[Server] All imports complete');

// Register database config loader so loadConfig() uses database settings
setDbConfigLoader(() => dbOperations.getSettingsAsConfig());

const config = loadConfig();
const app = express();
const httpServer = createServer(app);

// Track active processing state
let activeProcessing = {
  isProcessing: false,
  current: 0,
  total: 0,
  directory: null,
};
const io = new Server(httpServer, {
  cors: {
    origin: config.server.corsOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: config.server.corsOrigins }));
app.use(express.json({ limit: '10mb' }));

// API versioning middleware - supports /api/v1/... routes
app.use(apiVersioning());

// API logging middleware - logs all API calls except health checks and log queries
app.use(apiLoggerMiddleware());

let activeWatcher = null;

app.get('/api/health', async (req, res) => {
  const detailed = req.query.detailed === 'true';
  const memStatus = memoryManager.getStatus();
  const ollamaStatus = getConnectionStatus();

  // Basic health info
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiVersion: API_VERSION,
    uptime: process.uptime(),
    uptimeFormatted: formatUptime(process.uptime()),
  };

  // Add detailed info if requested
  if (detailed) {
    // Check database
    let dbStatus = 'ok';
    try {
      dbOperations.getSettings(); // Simple query to check DB
    } catch {
      dbStatus = 'error';
      health.status = 'degraded';
    }

    // Check Ollama connection
    let aiStatus = 'ok';
    if (!ollamaStatus.connected) {
      aiStatus = 'disconnected';
      health.status = health.status === 'ok' ? 'degraded' : health.status;
    }

    // Get rate limit status
    const rateLimitStatus = getRateLimitStatus();

    health.checks = {
      database: {
        status: dbStatus,
        type: 'sqlite',
      },
      ai: {
        status: aiStatus,
        provider: getProviderType(),
        connected: ollamaStatus.connected,
        model: ollamaStatus.model || 'unknown',
        lastCheck: ollamaStatus.lastCheck,
      },
      rateLimit: {
        status: rateLimitStatus.limited ? 'limited' : 'ok',
        requests: rateLimitStatus.currentRequests,
        limit: rateLimitStatus.maxRequests,
        windowMs: rateLimitStatus.windowMs,
      },
      memory: {
        status: memStatus.status,
        heapUsedMB: memStatus.current.heapUsedMB,
        heapTotalMB: memStatus.current.heapTotalMB,
        rssMB: memStatus.current.rssMB,
        threshold: {
          warn: memStatus.threshold.warn,
          critical: memStatus.threshold.critical,
        },
      },
      processing: {
        isProcessing: activeProcessing.isProcessing,
        current: activeProcessing.current,
        total: activeProcessing.total,
      },
    };
  } else {
    // Basic memory info for non-detailed requests
    health.memory = memStatus.current;
  }

  // Set appropriate status code
  const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json(getApiInfo());
});

// Memory management endpoints
app.get('/api/system/memory', (req, res) => {
  const status = memoryManager.getStatus();
  const trend = memoryManager.getMemoryTrend();
  res.json({ success: true, ...status, trend });
});

app.post('/api/system/memory/cleanup', (req, res) => {
  const snapshot = memoryManager.forceCleanup();
  res.json({ success: true, message: 'Cleanup completed', memory: snapshot });
});

app.post('/api/system/memory/configure', (req, res) => {
  try {
    const { warnThresholdMB, criticalThresholdMB, checkIntervalMs, cleanupIntervalMs } = req.body;
    memoryManager.configure({
      warnThresholdMB,
      criticalThresholdMB,
      checkIntervalMs,
      cleanupIntervalMs,
    });
    res.json({ success: true, status: memoryManager.getStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Performance metrics endpoints
app.get('/api/system/metrics', (req, res) => {
  try {
    const metrics = metricsService.getMetrics();
    const memStatus = memoryManager.getStatus();
    const memTrend = memoryManager.getMemoryTrend();

    // Determine memory status based on heap usage percentage
    const heapUsedPercent = memStatus.current?.heapUsedPercent || 0;
    let memoryStatusLevel = 'normal';
    if (heapUsedPercent > 90) {
      memoryStatusLevel = 'critical';
    } else if (heapUsedPercent > 70) {
      memoryStatusLevel = 'warning';
    }

    res.json({
      success: true,
      ...metrics,
      memory: {
        current: memStatus.current,
        status: memoryStatusLevel,
        threshold: {
          warn: memStatus.thresholds?.warnMB || 500,
          critical: memStatus.thresholds?.criticalMB || 800,
        },
        trend: {
          direction: memTrend.trend || 'stable',
          changePercent: memTrend.change || 0,
          samples: memStatus.recentHistory?.length || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset all data (logs, queues, processed files) - keeps settings and prompts
app.post('/api/system/reset-data', (req, res) => {
  try {
    // Reset active processing state
    activeProcessing = {
      isProcessing: false,
      current: 0,
      total: 0,
      directory: null,
      batchId: null,
    };

    // Clear all data tables
    const deletedCounts = dbOperations.resetAllData();

    // Reset metrics
    metricsService.reset();

    // Emit events to notify clients
    io.emit('processing:batch-end', activeProcessing);
    io.emit('data:reset', { success: true });

    logger.info('All data reset successfully', deletedCounts);
    res.json({
      success: true,
      message: 'All data has been reset',
      deleted: deletedCounts,
    });
  } catch (error) {
    logger.error(`Reset data error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/system/metrics/reset', (req, res) => {
  try {
    metricsService.reset();
    res.json({ success: true, message: 'Metrics reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/config', (req, res) => {
  try {
    // Load settings from database
    const dbConfig = dbOperations.getSettingsAsConfig();
    res.json(dbConfig);
  } catch (error) {
    // Fallback to in-memory config if database fails
    const safeConfig = { ...config };
    res.json(safeConfig);
  }
});

// Validate config without saving
app.post('/api/config/validate', (req, res) => {
  try {
    const result = validateConfig(req.body);
    if (result.success) {
      res.json({ success: true, valid: true, data: result.data });
    } else {
      res.json({ success: true, valid: false, errors: result.errors });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    // Validate config before saving
    const validation = validateConfig(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        validationErrors: validation.errors
      });
    }

    // Save to database
    dbOperations.saveConfigToSettings(req.body);

    // Also update in-memory config for backward compatibility
    Object.assign(config, req.body);

    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export complete settings (config + prompts) as JSON
app.get('/api/config/export', (req, res) => {
  try {
    // Get config from database
    const config = dbOperations.getSettingsAsConfig();

    // Get all prompts
    const prompts = dbOperations.getAllPrompts();

    // Create export bundle
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      config,
      prompts: prompts.map(p => ({
        category: p.category,
        prompt: p.prompt,
        description: p.description,
        isDefault: p.is_default === 1,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="genorganize-settings-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import settings from exported JSON
app.post('/api/config/import', (req, res) => {
  try {
    const { config: importedConfig, prompts: importedPrompts, version } = req.body;

    if (!version) {
      return res.status(400).json({ success: false, error: 'Invalid import file: missing version' });
    }

    const results = { config: false, prompts: { updated: 0, failed: 0 } };
    const errors = [];

    // Import config if provided
    if (importedConfig) {
      const validation = validateConfig(importedConfig);
      if (validation.success) {
        dbOperations.saveConfigToSettings(importedConfig);
        Object.assign(config, importedConfig);
        results.config = true;
      } else {
        errors.push({ type: 'config', errors: validation.errors });
      }
    }

    // Import prompts if provided
    if (importedPrompts && Array.isArray(importedPrompts)) {
      for (const prompt of importedPrompts) {
        try {
          if (!prompt.category || !prompt.prompt) {
            errors.push({ type: 'prompt', category: prompt.category, error: 'Missing category or prompt' });
            results.prompts.failed++;
            continue;
          }

          // Check if prompt exists
          const existing = dbOperations.getPromptByCategory(prompt.category);
          if (existing) {
            // Update existing prompt
            dbOperations.updatePromptWithHistory(
              prompt.category,
              prompt.prompt,
              prompt.description,
              'Imported from settings file'
            );
          } else if (!prompt.isDefault) {
            // Create new custom prompt
            dbOperations.createPrompt(prompt.category, prompt.prompt, prompt.description || '');
            dbOperations.addCategoryToCategorizationPrompt(prompt.category, prompt.description || '');
          }
          results.prompts.updated++;
        } catch (err) {
          errors.push({ type: 'prompt', category: prompt.category, error: err.message });
          results.prompts.failed++;
        }
      }
    }

    res.json({
      success: errors.length === 0,
      message: `Imported config: ${results.config}, prompts: ${results.prompts.updated} updated, ${results.prompts.failed} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ollama/status', async (req, res) => {
  // Use silent mode to avoid spamming logs on periodic health checks
  const result = await testConnection(true);
  res.json(result);
});

// Connection status endpoint with detailed info
app.get('/api/ollama/connection', (req, res) => {
  const status = getConnectionStatus();
  res.json(status);
});

// AI validation failures endpoint for debugging
app.get('/api/ai/validation-failures', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const failures = responseValidator.getRecentFailures(limit);
  res.json({ success: true, failures });
});

// Rate limiting endpoints
app.get('/api/ai/rate-limit', (req, res) => {
  const status = getRateLimitStatus();
  res.json({ success: true, ...status });
});

app.post('/api/ai/rate-limit', (req, res) => {
  try {
    const { maxTokens, refillRate, maxQueueSize, requestTimeout, enabled } = req.body;
    const options = {};
    if (maxTokens !== undefined) options.maxTokens = maxTokens;
    if (refillRate !== undefined) options.refillRate = refillRate;
    if (maxQueueSize !== undefined) options.maxQueueSize = maxQueueSize;
    if (requestTimeout !== undefined) options.requestTimeout = requestTimeout;
    if (enabled !== undefined) options.enabled = enabled;

    const status = configureRateLimit(options);
    res.json({ success: true, message: 'Rate limit configuration updated', ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Prompts API
app.get('/api/prompts', (req, res) => {
  try {
    const prompts = dbOperations.getAllPrompts();
    res.json({ success: true, prompts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/prompts/:category', (req, res) => {
  try {
    const { category } = req.params;
    const prompt = dbOperations.getPromptByCategory(category);
    if (prompt) {
      res.json({ success: true, prompt });
    } else {
      res.status(404).json({ success: false, error: 'Prompt not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/prompts/:category', (req, res) => {
  try {
    const { category } = req.params;
    const { prompt, description, changeReason } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    // Use versioned update to track history
    const result = dbOperations.updatePromptWithHistory(category, prompt, description, changeReason);

    // If description changed, update the categorization prompt too
    if (description !== undefined) {
      dbOperations.updateCategoryInCategorizationPrompt(category, description);
    }
    res.json({ success: true, message: 'Prompt updated', version: result.version });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Prompt versioning endpoints
app.get('/api/prompts/:category/history', (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const history = dbOperations.getPromptHistory(category, limit);
    const current = dbOperations.getPromptByCategory(category);
    res.json({
      success: true,
      category,
      currentVersion: current?.version || 1,
      history,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/prompts/:category/version/:version', (req, res) => {
  try {
    const { category, version } = req.params;
    const versionData = dbOperations.getPromptVersion(category, parseInt(version));
    if (versionData) {
      res.json({ success: true, version: versionData });
    } else {
      res.status(404).json({ success: false, error: 'Version not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/prompts/:category/rollback', (req, res) => {
  try {
    const { category } = req.params;
    const { toVersion } = req.body;
    if (!toVersion) {
      return res.status(400).json({ success: false, error: 'toVersion is required' });
    }
    const result = dbOperations.rollbackPrompt(category, parseInt(toVersion));
    res.json({ success: true, message: 'Prompt rolled back', ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/prompts/:category/diff', (req, res) => {
  try {
    const { category } = req.params;
    const { v1, v2 } = req.query;
    if (!v1 || !v2) {
      return res.status(400).json({ success: false, error: 'v1 and v2 query parameters are required' });
    }
    const diff = dbOperations.comparePromptVersions(category, parseInt(v1), parseInt(v2));
    res.json({ success: true, ...diff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/prompts/:category/reset', (req, res) => {
  try {
    const { category } = req.params;
    const success = dbOperations.resetPromptToDefault(category);
    if (success) {
      res.json({ success: true, message: 'Prompt reset to default' });
    } else {
      res.status(404).json({ success: false, error: 'No default prompt for this category' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new file type with custom prompt
app.post('/api/prompts', (req, res) => {
  try {
    const { category, prompt, description, folderDestination } = req.body;
    if (!category || !prompt) {
      return res.status(400).json({ success: false, error: 'category and prompt are required' });
    }
    // Validate category name (lowercase, underscores only)
    const validCategory = category.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (validCategory !== category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category must be lowercase with underscores only (e.g., my_custom_type)' 
      });
    }
    // Check if category already exists
    const existing = dbOperations.getPromptByCategory(category);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Category already exists. Use PUT to update.' });
    }
    // Create the prompt with description
    const desc = description || 'custom file type';
    dbOperations.createPrompt(category, prompt, desc);
    // Update categorization prompt to include new category with description
    dbOperations.addCategoryToCategorizationPrompt(category, desc);
    // Add folder rule if destination provided
    if (folderDestination) {
      dbOperations.addFolderRule(category, folderDestination);
    }
    res.json({ success: true, message: 'File type created', category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a custom file type
app.delete('/api/prompts/:category', (req, res) => {
  try {
    const { category } = req.params;
    // Check if it's a default category
    const defaultPrompt = dbOperations.getDefaultPrompt(category);
    if (defaultPrompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete default categories. You can only modify their prompts.' 
      });
    }
    // Delete the prompt
    const deleted = dbOperations.deletePrompt(category);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    // Remove from categorization prompt
    dbOperations.removeCategoryFromCategorizationPrompt(category);
    // Remove folder rule
    dbOperations.removeFolderRule(category);
    res.json({ success: true, message: 'File type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/process/file', async (req, res) => {
  const {
    filePath,
    dryRun = true,
    autoMove = false,
    isRegeneration = false,
    feedback = null,
    rejectedName = null
  } = req.body;
  const startTime = Date.now();

  if (!filePath) {
    return res.status(400).json({ success: false, error: 'filePath is required' });
  }

  try {
    const fullPath = resolve(filePath);

    if (!(await fileExists(fullPath))) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Mark file as processing in database
    dbOperations.setFileProcessing(fullPath);
    io.emit('processing:file-start', { filePath: fullPath });

    // Update processing state and broadcast
    activeProcessing.current++;
    io.emit('processing:progress', activeProcessing);

    const result = await organizeFile(fullPath, {
      dryRun,
      autoMove,
      isRegeneration,
      feedback,
      rejectedName
    });

    // Record metrics
    const processingTime = Date.now() - startTime;
    metricsService.recordProcessing(result.success, processingTime);

    // Clear processing status
    dbOperations.clearFileProcessing(fullPath);

    // Broadcast completion of this file
    io.emit('processing:file-complete', { filePath: fullPath, result });

    res.json(result);
  } catch (error) {
    // Record failed processing
    const processingTime = Date.now() - startTime;
    metricsService.recordProcessing(false, processingTime);

    // Clear processing status on error too
    dbOperations.clearFileProcessing(resolve(filePath));

    logger.error(`Process file error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get files currently being processed
app.get('/api/process/active', (req, res) => {
  try {
    const processingFiles = dbOperations.getProcessingFiles();
    res.json({ files: processingFiles });
  } catch (error) {
    logger.error(`Get active processing error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a batch queue - saves files to database before processing
app.post('/api/queue/create', (req, res) => {
  const { filePaths, directory } = req.body;

  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return res.status(400).json({ success: false, error: 'filePaths array is required' });
  }

  try {
    const batchId = dbOperations.createBatch(filePaths);
    activeProcessing = {
      isProcessing: true,
      current: 0,
      total: filePaths.length,
      directory: directory || null,
      batchId,
    };

    // Initialize queue metrics
    metricsService.updateQueueMetrics(filePaths.length, 0);

    io.emit('processing:batch-start', activeProcessing);
    res.json({ success: true, batchId, total: filePaths.length });
  } catch (error) {
    logger.error(`Create queue error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get pending queue (for resuming after restart)
app.get('/api/queue/pending', (req, res) => {
  try {
    const activeBatch = dbOperations.getActiveBatch();
    if (!activeBatch || activeBatch.remaining === 0) {
      return res.json({ hasPending: false, files: [], total: 0, completed: 0 });
    }

    const pendingJobs = dbOperations.getPendingJobs();

    // Filter out files that already have results in processed_files
    // This can happen if browser crashed after processing but before marking job complete
    const trulyPendingFiles = [];
    const alreadyProcessedJobIds = [];

    for (const job of pendingJobs) {
      const existingResult = dbOperations.getProcessedFile(job.file_path);
      if (existingResult && existingResult.suggested_name && existingResult.status === 'previewed') {
        // This file was already processed - mark the job as complete
        alreadyProcessedJobIds.push(job.id);
      } else {
        trulyPendingFiles.push(job.file_path);
      }
    }

    // Clean up orphan jobs (mark as completed since files were already processed)
    for (const jobId of alreadyProcessedJobIds) {
      dbOperations.markJobCompleted(jobId);
    }

    // If all files were already processed, no pending queue
    if (trulyPendingFiles.length === 0) {
      return res.json({ hasPending: false, files: [], total: 0, completed: 0 });
    }

    res.json({
      hasPending: true,
      batchId: activeBatch.batch_id,
      files: trulyPendingFiles,
      total: activeBatch.total,
      completed: activeBatch.completed + alreadyProcessedJobIds.length,
      remaining: trulyPendingFiles.length,
    });
  } catch (error) {
    logger.error(`Get pending queue error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark a job as completed
app.post('/api/queue/complete', (req, res) => {
  const { filePath, batchId } = req.body;

  try {
    // Find the job by file path and batch
    const jobs = dbOperations.getJobsByBatch(batchId);
    const job = jobs.find(j => j.file_path === filePath);

    if (job) {
      dbOperations.markJobCompleted(job.id);

      // Update active processing count
      if (activeProcessing.batchId === batchId) {
        activeProcessing.current++;
        io.emit('processing:progress', activeProcessing);
      }

      // Update queue metrics
      const stats = dbOperations.getBatchStats(batchId);
      metricsService.updateQueueMetrics(stats.pending || 0, stats.completed || 0);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error(`Complete job error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark a job as failed
app.post('/api/queue/fail', (req, res) => {
  const { filePath, batchId, error: errorMsg } = req.body;

  try {
    const jobs = dbOperations.getJobsByBatch(batchId);
    const job = jobs.find(j => j.file_path === filePath);

    if (job) {
      dbOperations.markJobFailed(job.id, errorMsg);

      if (activeProcessing.batchId === batchId) {
        activeProcessing.current++;
        io.emit('processing:progress', activeProcessing);
      }

      // Update queue metrics
      const stats = dbOperations.getBatchStats(batchId);
      metricsService.updateQueueMetrics(stats.pending || 0, stats.completed || 0);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error(`Fail job error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear pending queue (when user dismisses the resume banner)
app.post('/api/queue/clear', (req, res) => {
  try {
    // Get active batch and cancel all pending jobs
    const activeBatch = dbOperations.getActiveBatch();
    if (activeBatch) {
      dbOperations.cancelBatch(activeBatch.batch_id);
    }

    // Reset active processing state
    activeProcessing = {
      isProcessing: false,
      current: 0,
      total: 0,
      directory: null,
      batchId: null,
    };

    io.emit('processing:batch-end', activeProcessing);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Clear queue error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start batch processing - called by frontend to track state
app.post('/api/process/batch-start', (req, res) => {
  const { total, directory } = req.body;
  activeProcessing = {
    isProcessing: true,
    current: 0,
    total: total || 0,
    directory: directory || null,
  };
  io.emit('processing:batch-start', activeProcessing);
  res.json({ success: true, ...activeProcessing });
});

// End batch processing
app.post('/api/process/batch-end', (req, res) => {
  activeProcessing = {
    isProcessing: false,
    current: 0,
    total: 0,
    directory: null,
    batchId: null,
  };
  io.emit('processing:batch-end', activeProcessing);
  res.json({ success: true });
});

// Get current processing state
app.get('/api/process/status', (req, res) => {
  // Also check database for pending queue
  try {
    const activeBatch = dbOperations.getActiveBatch();
    if (activeBatch && activeBatch.remaining > 0 && !activeProcessing.isProcessing) {
      // There's a pending queue from a previous session
      res.json({
        isProcessing: false,
        hasPendingQueue: true,
        batchId: activeBatch.batch_id,
        total: activeBatch.total,
        completed: activeBatch.completed,
        remaining: activeBatch.remaining,
      });
    } else {
      res.json(activeProcessing);
    }
  } catch (error) {
    res.json(activeProcessing);
  }
});

app.post('/api/process/directory', async (req, res) => {
  const { dirPath, recursive = false, dryRun = true, autoMove = false } = req.body;

  if (!dirPath) {
    return res.status(400).json({ success: false, error: 'dirPath is required' });
  }

  try {
    const fullPath = resolve(dirPath);
    const stats = await fs.stat(fullPath);

    if (!stats.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Path is not a directory' });
    }

    io.emit('processing:start', { dirPath: fullPath, recursive });

    const result = await organizeDirectory(fullPath, {
      recursive,
      dryRun,
      autoMove,
      onProgress: (progress) => {
        io.emit('processing:progress', progress);
      },
    });

    io.emit('processing:complete', result.summary);
    res.json(result);
  } catch (error) {
    logger.error(`Process directory error: ${error.message}`);
    io.emit('processing:error', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/apply', async (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ success: false, error: 'files array is required' });
  }

  // Get current config to check if auto-organize is enabled
  const currentConfig = dbOperations.getSettingsAsConfig();
  const autoOrganize = currentConfig.folders?.enabled === true;
  const createMissingFolders = currentConfig.folders?.createIfMissing !== false;
  const folderRules = currentConfig.folders?.rules || [];
  const homeDirectory = currentConfig.ui?.defaultPath || '';

  const results = [];

  for (const file of files) {
    try {
      // If suggestedName is provided, just rename directly (no AI re-run)
      if (file.suggestedName) {
        const fullPath = resolve(file.filePath);
        const dir = dirname(fullPath);
        let newPath = join(dir, file.suggestedName);

        // Check if auto-organize is enabled
        if (autoOrganize) {
          // Get the category from the processed_files table
          const processedFile = dbOperations.getProcessedFile(file.filePath);
          const category = processedFile?.category;

          if (category) {
            // Find the folder rule for this category
            const rule = folderRules.find(r => r.type === category);
            if (rule && rule.destination) {
              // Resolve the destination path - use homeDirectory if valid, otherwise file's directory
              // Only use homeDirectory if it's a non-empty absolute path
              const baseDir = (homeDirectory && homeDirectory.startsWith('/')) ? homeDirectory : dir;
              let destDir;
              if (rule.destination.startsWith('/')) {
                // Absolute path - use as-is
                destDir = rule.destination;
              } else {
                // Relative path - use join() for predictable behavior
                // Clean up destination (remove ./ prefix if present)
                const cleanDest = rule.destination.replace(/^\.\//, '');
                destDir = join(baseDir, cleanDest);
              }

              // Create the folder if it doesn't exist
              if (createMissingFolders) {
                await fs.mkdir(destDir, { recursive: true });
              }

              // Check if folder exists before moving
              try {
                await fs.access(destDir);
                newPath = join(destDir, file.suggestedName);
                logger.info(`Auto-organizing to folder: ${destDir}`);
              } catch {
                // Folder doesn't exist and we can't create it, keep in original location
                logger.warn(`Destination folder doesn't exist and createIfMissing is false: ${destDir}`);
              }
            }
          }
        }

        await fs.rename(fullPath, newPath);
        logger.info(`Renamed: ${basename(fullPath)} -> ${file.suggestedName}${autoOrganize ? ` (moved to ${dirname(newPath)})` : ''}`);

        // Mark as applied in database
        dbOperations.markFileApplied(file.filePath, newPath);
        // Clear from processing status
        dbOperations.clearFileProcessing(file.filePath);

        results.push({
          success: true,
          filePath: file.filePath,
          originalName: basename(fullPath),
          suggestedName: file.suggestedName,
          newPath,
        });
      } else {
        // Fallback: re-run AI if no suggestedName provided
        const result = await organizeFile(file.filePath, {
          dryRun: false,
          autoMove: file.autoMove || false,
        });
        results.push(result);
      }
    } catch (error) {
      results.push({ success: false, filePath: file.filePath, error: error.message });
    }
  }

  res.json({
    results,
    summary: {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  });
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const includeUndone = req.query.includeUndone === 'true';

  const history = getHistory({ limit, includeUndone });
  res.json({ history });
});

// Queue endpoints
app.post('/api/queue/batch', async (req, res) => {
  const { filePaths, priority = 0 } = req.body;

  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return res.status(400).json({ success: false, error: 'filePaths array is required' });
  }

  try {
    const batchId = await jobQueue.createBatch(filePaths, { priority });
    
    // Start processing
    jobQueue.start();
    
    res.json({ 
      success: true, 
      batchId, 
      total: filePaths.length,
      message: `Batch created with ${filePaths.length} files` 
    });
  } catch (error) {
    logger.error(`Create batch error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/queue/status', (req, res) => {
  const status = jobQueue.getStatus();
  res.json(status);
});

app.get('/api/queue/batch/:batchId', (req, res) => {
  const { batchId } = req.params;
  const stats = dbOperations.getBatchStats(batchId);
  const jobs = dbOperations.getJobsByBatch(batchId);
  res.json({ stats, jobs });
});

app.post('/api/queue/stop', (req, res) => {
  jobQueue.stop();
  res.json({ success: true, message: 'Queue stopped' });
});

// Database endpoints
app.get('/api/db/processed', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const files = dbOperations.getRecentFiles(limit);
  res.json({ files });
});

app.get('/api/db/pending', (req, res) => {
  const files = dbOperations.getPendingFiles();
  res.json({ files });
});

app.get('/api/db/by-directory', (req, res) => {
  const { path: dirPath } = req.query;
  if (!dirPath) {
    return res.status(400).json({ success: false, error: 'path is required' });
  }
  const pending = dbOperations.getFilesByDirectory(dirPath);
  const applied = dbOperations.getAppliedFilesByDirectory(dirPath);
  res.json({ pending, applied });
});

app.get('/api/db/cached/:filePath', (req, res) => {
  const filePath = decodeURIComponent(req.params.filePath);
  const cached = dbOperations.getProcessedFile(filePath);
  res.json({ cached });
});

app.post('/api/db/clear-applied', (req, res) => {
  // This endpoint is called after applying changes to clear the pending/previewed status
  // The actual markFileApplied is already called in /api/apply with the correct new_path
  // So we just return success here - no need to call markFileApplied again
  res.json({ success: true });
});

app.post('/api/db/mark-skipped', (req, res) => {
  const { filePaths } = req.body;
  
  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return res.status(400).json({ success: false, error: 'filePaths array is required' });
  }

  try {
    for (const filePath of filePaths) {
      const originalName = basename(filePath);
      dbOperations.saveProcessedFile(
        filePath,
        originalName,
        originalName,
        filePath,
        'skipped',
        'skipped',
        null
      );
    }
    logger.info(`Marked ${filePaths.length} files as skipped (keep original)`);
    res.json({ success: true, count: filePaths.length });
  } catch (error) {
    logger.error('Failed to mark files as skipped:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/db/update-suggested-name', (req, res) => {
  const { filePath, suggestedName } = req.body;
  
  if (!filePath || !suggestedName) {
    return res.status(400).json({ success: false, error: 'filePath and suggestedName are required' });
  }

  try {
    // Get existing record and update it
    const existing = dbOperations.getProcessedFile(filePath);
    if (existing) {
      dbOperations.updateProcessedFile(
        existing.id,
        suggestedName,
        existing.new_path,
        existing.category,
        existing.status,
        existing.error
      );
      logger.info(`Updated suggested name for ${filePath} to ${suggestedName}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'File not found in database' });
    }
  } catch (error) {
    logger.error('Failed to update suggested name:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/undo/:historyId', async (req, res) => {
  const { historyId } = req.params;

  try {
    const result = await undoRename(historyId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/file/delete', async (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'filePath is required' });
  }
  
  try {
    const fullPath = resolve(filePath);
    
    if (!(await fileExists(fullPath))) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    await fs.unlink(fullPath);
    logger.info(`Deleted file: ${fullPath}`);
    
    res.json({ success: true });
  } catch (error) {
    logger.error(`Delete file error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/file/preview', async (req, res) => {
  const { path: filePath } = req.query;
  
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'path is required' });
  }
  
  try {
    const fullPath = resolve(filePath);
    const stats = await fs.stat(fullPath);
    
    if (!stats.isFile()) {
      return res.status(400).json({ success: false, error: 'Path is not a file' });
    }
    
    // Determine content type based on extension
    const ext = fullPath.toLowerCase().split('.').pop();
    
    // Import cache utilities
    const { getCachedPreview, streamCachedPreview, generateAndCachePreview } = await import('./utils/previewCache.js');
    
    // File types that need conversion (cache these)
    const needsConversion = ['psd', 'pdf', 'ai', 'docx', 'doc', 'xlsx', 'xls', 'txt', 'md', 'csv', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
    
    if (needsConversion.includes(ext)) {
      // Check cache first
      const cachedPath = await getCachedPreview(fullPath, stats);
      if (cachedPath) {
        return streamCachedPreview(cachedPath, res);
      }
      
      // Generate preview based on file type
      let generateFn;
      
      if (ext === 'psd') {
        generateFn = async () => {
          const PSD = (await import('psd')).default;
          const psd = await PSD.open(fullPath);
          const png = psd.image.toPng();
          const stream = png.pack();
          // Collect stream to buffer for caching
          const chunks = [];
          await new Promise((resolve, reject) => {
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', resolve);
            stream.on('error', reject);
          });
          return Buffer.concat(chunks);
        };
      } else if (ext === 'pdf') {
        generateFn = async () => {
          const { execSync } = await import('child_process');
          const path = await import('path');
          const os = await import('os');
          const crypto = await import('crypto');

          const tempPrefix = path.join(os.tmpdir(), `pdf-preview-${crypto.randomBytes(8).toString('hex')}`);
          execSync(`pdftoppm -png -f 1 -l 1 -scale-to 512 "${fullPath}" "${tempPrefix}"`, { timeout: 30000 });

          // pdftoppm generates different names based on total page count:
          // - 1-9 pages: -1.png
          // - 10-99 pages: -01.png
          // - 100+ pages: -001.png
          const possibleNames = [
            `${tempPrefix}-1.png`,
            `${tempPrefix}-01.png`,
            `${tempPrefix}-001.png`
          ];
          let previewPath = null;
          for (const name of possibleNames) {
            try {
              await fs.access(name);
              previewPath = name;
              break;
            } catch {}
          }
          if (!previewPath) {
            throw new Error(`pdftoppm did not create expected output file`);
          }
          const imageBuffer = await fs.readFile(previewPath);
          await fs.unlink(previewPath).catch(() => {});
          return imageBuffer;
        };
      } else if (ext === 'ai') {
        // Adobe Illustrator files - use Ghostscript
        generateFn = async () => {
          const { execSync } = await import('child_process');
          const path = await import('path');
          const os = await import('os');
          const crypto = await import('crypto');
          
          const tempFile = path.join(os.tmpdir(), `ai-preview-${crypto.randomBytes(8).toString('hex')}.png`);
          execSync(`gs -dNOPAUSE -dBATCH -dSAFER -sDEVICE=png16m -r150 -dFirstPage=1 -dLastPage=1 -dEPSFitPage -sOutputFile="${tempFile}" "${fullPath}"`, { timeout: 60000 });
          
          const imageBuffer = await fs.readFile(tempFile);
          await fs.unlink(tempFile).catch(() => {});
          return imageBuffer;
        };
      } else if (ext === 'docx') {
        // DOCX files - use mammoth to convert to HTML, then render with puppeteer
        generateFn = async () => {
          const mammoth = await import('mammoth');
          const puppeteer = await import('puppeteer');

          const result = await mammoth.convertToHtml({ path: fullPath });
          const html = `<!DOCTYPE html><html><head><style>
            body { font-family: Arial, sans-serif; padding: 20px; background: white; margin: 0; width: 600px; }
            img { max-width: 100%; } p { margin: 0.5em 0; }
          </style></head><body>${result.value}</body></html>`;

          const browser = await puppeteer.default.launch({ headless: true });
          const page = await browser.newPage();
          await page.setViewport({ width: 600, height: 800 });
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const imageBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 600, height: 800 } });
          await browser.close();
          return imageBuffer;
        };
      } else if (ext === 'doc') {
        // DOC files (old binary format) - convert to PDF using LibreOffice, then render
        generateFn = async () => {
          const { execSync } = await import('child_process');
          const path = await import('path');
          const os = await import('os');
          const crypto = await import('crypto');

          const tempDir = path.join(os.tmpdir(), `doc-preview-${crypto.randomBytes(8).toString('hex')}`);
          await fs.mkdir(tempDir, { recursive: true });

          try {
            // Convert DOC to PDF using LibreOffice (soffice)
            execSync(`soffice --headless --convert-to pdf --outdir "${tempDir}" "${fullPath}"`, {
              timeout: 60000,
              stdio: ['pipe', 'pipe', 'pipe']
            });

            // Find the generated PDF
            const baseName = path.basename(fullPath, '.doc');
            const pdfPath = path.join(tempDir, `${baseName}.pdf`);

            // Convert PDF to PNG using pdftoppm
            const tempPrefix = path.join(tempDir, 'preview');
            execSync(`pdftoppm -png -f 1 -l 1 -scale-to 512 "${pdfPath}" "${tempPrefix}"`, { timeout: 30000 });

            // pdftoppm generates different names based on total page count
            const possibleNames = [
              `${tempPrefix}-1.png`,
              `${tempPrefix}-01.png`,
              `${tempPrefix}-001.png`
            ];
            let previewPath = null;
            for (const name of possibleNames) {
              try {
                await fs.access(name);
                previewPath = name;
                break;
              } catch {}
            }
            if (!previewPath) {
              throw new Error(`pdftoppm did not create expected output file`);
            }
            const imageBuffer = await fs.readFile(previewPath);

            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

            return imageBuffer;
          } catch (err) {
            // Clean up on error
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            throw err;
          }
        };
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Excel files - convert to PDF using LibreOffice, then render
        generateFn = async () => {
          const { execSync } = await import('child_process');
          const path = await import('path');
          const os = await import('os');
          const crypto = await import('crypto');

          const tempDir = path.join(os.tmpdir(), `xlsx-preview-${crypto.randomBytes(8).toString('hex')}`);
          await fs.mkdir(tempDir, { recursive: true });

          try {
            // Convert Excel to PDF using LibreOffice (soffice)
            execSync(`soffice --headless --convert-to pdf --outdir "${tempDir}" "${fullPath}"`, {
              timeout: 60000,
              stdio: ['pipe', 'pipe', 'pipe']
            });

            // Find the generated PDF
            const baseName = path.basename(fullPath, `.${ext}`);
            const pdfPath = path.join(tempDir, `${baseName}.pdf`);

            // Convert PDF to PNG using pdftoppm
            const tempPrefix = path.join(tempDir, 'preview');
            execSync(`pdftoppm -png -f 1 -l 1 -scale-to 512 "${pdfPath}" "${tempPrefix}"`, { timeout: 30000 });

            // pdftoppm generates different names based on total page count
            const possibleNames = [
              `${tempPrefix}-1.png`,
              `${tempPrefix}-01.png`,
              `${tempPrefix}-001.png`
            ];
            let previewPath = null;
            for (const name of possibleNames) {
              try {
                await fs.access(name);
                previewPath = name;
                break;
              } catch {}
            }
            if (!previewPath) {
              throw new Error(`pdftoppm did not create expected output file`);
            }
            const imageBuffer = await fs.readFile(previewPath);

            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

            return imageBuffer;
          } catch (err) {
            // Clean up on error
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            throw err;
          }
        };
      } else if (ext === 'txt' || ext === 'md') {
        generateFn = async () => {
          const puppeteer = await import('puppeteer');
          
          const textContent = await fs.readFile(fullPath, 'utf-8');
          const escapedContent = textContent.substring(0, 5000)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          
          const html = `<!DOCTYPE html><html><head><style>
            body { font-family: 'Courier New', monospace; font-size: 11px; padding: 15px; background: white; 
                   margin: 0; width: 600px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; }
          </style></head><body>${escapedContent}</body></html>`;
          
          const browser = await puppeteer.default.launch({ headless: true });
          const page = await browser.newPage();
          await page.setViewport({ width: 600, height: 800 });
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const imageBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 600, height: 800 } });
          await browser.close();
          return imageBuffer;
        };
      } else if (ext === 'csv') {
        generateFn = async () => {
          const puppeteer = await import('puppeteer');
          
          const csvContent = await fs.readFile(fullPath, 'utf-8');
          const lines = csvContent.split('\n').slice(0, 30);
          const rows = lines.map(line => {
            const cells = line.split(',').map(cell => 
              cell.trim().replace(/^"|"$/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            );
            return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
          }).join('');
          
          const html = `<!DOCTYPE html><html><head><style>
            body { font-family: Arial, sans-serif; font-size: 10px; padding: 10px; background: white; margin: 0; width: 600px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ddd; padding: 4px 6px; text-align: left; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            tr:first-child { background: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background: #fafafa; }
          </style></head><body><table>${rows}</table></body></html>`;
          
          const browser = await puppeteer.default.launch({ headless: true });
          const page = await browser.newPage();
          await page.setViewport({ width: 600, height: 800 });
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const imageBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 600, height: 800 } });
          await browser.close();
          return imageBuffer;
        };
      } else if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) {
        // Video files - capture frame at 5 seconds (or 1 second for short videos)
        generateFn = async () => {
          const { execSync } = await import('child_process');
          const path = await import('path');
          const os = await import('os');
          const crypto = await import('crypto');
          
          const tempFile = path.join(os.tmpdir(), `video-preview-${crypto.randomBytes(8).toString('hex')}.png`);
          
          // Try to capture at 5 seconds, fall back to 1 second if video is shorter
          try {
            execSync(`ffmpeg -ss 5 -i "${fullPath}" -vframes 1 -vf "scale=600:-1" -y "${tempFile}" 2>/dev/null`, { timeout: 30000 });
          } catch {
            // Video might be shorter than 5 seconds, try 1 second
            try {
              execSync(`ffmpeg -ss 1 -i "${fullPath}" -vframes 1 -vf "scale=600:-1" -y "${tempFile}" 2>/dev/null`, { timeout: 30000 });
            } catch {
              // Try first frame
              execSync(`ffmpeg -i "${fullPath}" -vframes 1 -vf "scale=600:-1" -y "${tempFile}" 2>/dev/null`, { timeout: 30000 });
            }
          }
          
          const imageBuffer = await fs.readFile(tempFile);
          await fs.unlink(tempFile).catch(() => {});
          return imageBuffer;
        };
      }
      
      if (generateFn) {
        try {
          await generateAndCachePreview(fullPath, stats, generateFn, res);
          return;
        } catch (err) {
          logger.error(`Preview generation failed for ${ext}: ${err.message}`);
          return res.status(500).json({ success: false, error: `Failed to generate ${ext.toUpperCase()} preview` });
        }
      }
    }
    
    // Native image types - serve directly (no caching needed)
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'heic': 'image/heic',
      'avif': 'image/avif',
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const fileBuffer = await fs.readFile(fullPath);
    res.send(fileBuffer);
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// Cache management endpoints
app.get('/api/cache/stats', async (req, res) => {
  try {
    const { getCacheStats } = await import('./utils/previewCache.js');
    const stats = await getCacheStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/cache/clear', async (req, res) => {
  try {
    const { clearCache } = await import('./utils/previewCache.js');
    const result = await clearCache();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/files', async (req, res) => {
  const { path: dirPath = '.', recursive = 'false' } = req.query;

  try {
    const fullPath = resolve(dirPath);
    const stats = await fs.stat(fullPath);

    if (!stats.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Path is not a directory' });
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const items = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith('.'))
        .map(async (entry) => {
          const itemPath = join(fullPath, entry.name);
          const itemStats = await getFileStats(itemPath);

          return {
            name: entry.name,
            path: itemPath,
            isDirectory: entry.isDirectory(),
            isSupported: entry.isFile() ? isSupported(itemPath) : false,
            ...itemStats,
          };
        })
    );

    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      path: fullPath,
      items,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/watch/status', (req, res) => {
  if (activeWatcher) {
    res.json(activeWatcher.getStatus());
  } else {
    res.json({ isRunning: false });
  }
});

app.post('/api/watch/start', (req, res) => {
  const { directories, dryRun = false, autoMove = false, processedFolder = null } = req.body;

  if (activeWatcher && activeWatcher.isRunning) {
    return res.status(400).json({ success: false, error: 'Watcher already running' });
  }

  try {
    activeWatcher = createWatcher({
      directories: directories || config.watch.directories,
      dryRun,
      autoMove,
      processedFolder,
    });

    activeWatcher.on('ready', () => {
      io.emit('watch:ready');
    });

    activeWatcher.on('fileDetected', (data) => {
      io.emit('watch:fileDetected', data);
    });

    activeWatcher.on('processingComplete', (data) => {
      io.emit('watch:processingComplete', data);
    });

    activeWatcher.on('processingFailed', (data) => {
      io.emit('watch:processingFailed', data);
    });

    activeWatcher.on('error', (error) => {
      io.emit('watch:error', { error: error.message });
    });

    activeWatcher.start();

    res.json({ success: true, message: 'Watcher started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/watch/stop', (req, res) => {
  if (!activeWatcher || !activeWatcher.isRunning) {
    return res.status(400).json({ success: false, error: 'No watcher running' });
  }

  activeWatcher.stop();
  activeWatcher = null;

  res.json({ success: true, message: 'Watcher stopped' });
});

// ==================== LOGGING ENDPOINTS ====================

// Get AI logs with filtering and pagination
app.get('/api/logs/ai', (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      batchId: req.query.batchId,
      userAction: req.query.userAction,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      // Model filters
      model: req.query.model, // Filter by any model (categorization or naming)
      categorizationModel: req.query.categorizationModel,
      namingModel: req.query.namingModel,
      isRegeneration: req.query.isRegeneration !== undefined ? req.query.isRegeneration === 'true' : undefined,
    };
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    };

    const result = loggerService.getAILogs(filters, pagination);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Get AI logs error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single AI log with full details
app.get('/api/logs/ai/:requestId', (req, res) => {
  try {
    const log = loggerService.getLogById(req.params.requestId);
    if (log) {
      res.json({ success: true, log });
    } else {
      res.status(404).json({ success: false, error: 'Log not found' });
    }
  } catch (error) {
    logger.error(`Get AI log error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get API call logs
app.get('/api/logs/api', (req, res) => {
  try {
    const filters = {
      endpoint: req.query.endpoint,
      method: req.query.method,
      success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    };

    const result = loggerService.getAPILogs(filters, pagination);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Get API logs error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get error logs
app.get('/api/logs/errors', (req, res) => {
  try {
    const filters = {
      errorType: req.query.type,
      resolved: req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    };

    const result = loggerService.getErrorLogs(filters, pagination);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Get error logs error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
app.get('/api/logs/stats', (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'all';
    const stats = loggerService.getStats(timeRange);
    res.json({ success: true, stats });
  } catch (error) {
    logger.error(`Get stats error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get performance metrics
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = metricsService.getMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    logger.error(`Get metrics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset performance metrics
app.post('/api/metrics/reset', (req, res) => {
  try {
    metricsService.reset();
    res.json({ success: true, message: 'Metrics reset' });
  } catch (error) {
    logger.error(`Reset metrics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark error as resolved
app.put('/api/logs/errors/:errorId/resolve', (req, res) => {
  try {
    const { resolutionNotes } = req.body;
    loggerService.resolveError(req.params.errorId, resolutionNotes || '');
    res.json({ success: true, message: 'Error resolved' });
  } catch (error) {
    logger.error(`Resolve error log error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear old logs (admin)
app.delete('/api/logs/cleanup', (req, res) => {
  try {
    const days = parseInt(req.query.olderThan) || 30;
    const result = loggerService.cleanupOldLogs(days);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Cleanup logs error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear ALL logs (admin)
app.delete('/api/logs/clear-all', (req, res) => {
  try {
    const result = loggerService.clearAllLogs();
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Clear all logs error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record user feedback on a suggestion
app.post('/api/logs/feedback', (req, res) => {
  try {
    const { requestId, filePath, action, finalName } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: 'action is required' });
    }

    if (requestId) {
      loggerService.recordFeedback(requestId, action, finalName);
      res.json({ success: true, message: 'Feedback recorded' });
    } else if (filePath) {
      const success = loggerService.recordFeedbackByFilePath(filePath, action, finalName);
      if (success) {
        res.json({ success: true, message: 'Feedback recorded' });
      } else {
        res.status(404).json({ success: false, error: 'No AI log found for this file' });
      }
    } else {
      res.status(400).json({ success: false, error: 'requestId or filePath is required' });
    }
  } catch (error) {
    logger.error(`Record feedback error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get prompt effectiveness by category
app.get('/api/logs/effectiveness', (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'all';
    const effectiveness = loggerService.getPromptEffectiveness(timeRange);
    res.json({ success: true, effectiveness });
  } catch (error) {
    logger.error(`Get effectiveness error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get categories with low acceptance rates (need prompt improvement)
app.get('/api/logs/effectiveness/alerts', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 50;
    const timeRange = req.query.timeRange || 'all';
    const lowPerforming = loggerService.getLowPerformingCategories(threshold, timeRange);
    res.json({ success: true, lowPerforming });
  } catch (error) {
    logger.error(`Get effectiveness alerts error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get regeneration statistics for effectiveness dashboard
app.get('/api/logs/effectiveness/regenerations', (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'all';
    const stats = loggerService.getRegenerationStats(timeRange);
    res.json({ success: true, ...stats });
  } catch (error) {
    logger.error(`Get regeneration stats error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get model usage and effectiveness statistics
app.get('/api/logs/effectiveness/models', (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'all';
    const stats = loggerService.getModelStats(timeRange);
    res.json({ success: true, ...stats });
  } catch (error) {
    logger.error(`Get model stats error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent rejections/edits for analysis
app.get('/api/logs/rejections', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const timeRange = req.query.timeRange || 'all';
    const rejections = loggerService.getRecentRejections(limit, timeRange);
    res.json({ success: true, rejections });
  } catch (error) {
    logger.error(`Get rejections error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get feedback details by action type
app.get('/api/logs/feedback/:actionType', (req, res) => {
  try {
    const { actionType } = req.params;
    const validActions = ['total', 'accepted', 'edited', 'rejected', 'skipped'];

    if (!validActions.includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action type. Must be one of: ${validActions.join(', ')}`
      });
    }

    const timeRange = req.query.timeRange || 'all';
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    };

    const result = loggerService.getFeedbackDetails(actionType, timeRange, pagination);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Get feedback details error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Wire up queue events to WebSocket
jobQueue.on('batch:created', (data) => io.emit('queue:batch:created', data));
jobQueue.on('batch:progress', (data) => io.emit('queue:batch:progress', data));
jobQueue.on('job:started', (data) => io.emit('queue:job:started', data));
jobQueue.on('job:completed', (data) => io.emit('queue:job:completed', data));
jobQueue.on('job:failed', (data) => io.emit('queue:job:failed', data));
jobQueue.on('queue:empty', () => io.emit('queue:empty'));

// Wire up Ollama connection events to WebSocket
onConnectionChange((status) => {
  io.emit('ollama:connection', status);
  logger.debug(`Ollama connection status: ${status.status}`);
});

// Wire up rate limit events to WebSocket
onRateLimitEvent((data) => {
  io.emit('rateLimit:event', data);
  if (data.event === 'rejected') {
    logger.warn(`Rate limit rejected request: queue full (${data.queueSize})`);
  }
});

// Wire up memory manager events to WebSocket
memoryManager.on('warning', (snapshot) => {
  io.emit('system:memory:warning', snapshot);
});
memoryManager.on('critical', (snapshot) => {
  io.emit('system:memory:critical', snapshot);
});
memoryManager.on('cleanup', (data) => {
  io.emit('system:memory:cleanup', data);
});

// Register cleanup callbacks
memoryManager.registerCleanup(() => {
  // Clean up old completed jobs
  dbOperations.clearOldJobs();
});

// Track EventEmitters for leak detection
memoryManager.trackEventEmitter('jobQueue', jobQueue);
memoryManager.trackEventEmitter('io', io);

// Start memory monitoring
memoryManager.start();

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const PORT = config.server.port;

// Run migrations on startup
async function startServer() {
  try {
    // Run any pending database migrations
    logger.info('[Server] Starting migration check...');
    const result = await migrationRunner.runMigrations();
    logger.info('[Server] Migration check complete');
    if (result.applied > 0) {
      logger.info(`Applied ${result.applied} database migration(s)`);
    }
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`);
    logger.error('Server will continue, but database may be in an inconsistent state');
  }

  httpServer.listen(PORT, () => {
    logger.info(`GenOrganize API server running on http://localhost:${PORT}`);
    logger.info(`WebSocket server ready`);

    // Schedule automatic weekly log cleanup (keeps logs for 7 days)
    loggerService.scheduleWeeklyCleanup();
    logger.info('Scheduled automatic weekly log cleanup');

    // Initialize graceful shutdown handler
    gracefulShutdown.init(httpServer, io);

    // Register cleanup handlers
    gracefulShutdown.registerHandler('memoryManager', () => {
      memoryManager.stop();
    }, 1);

    gracefulShutdown.registerHandler('metricsService', () => {
      metricsService.shutdown();
    }, 2);

    gracefulShutdown.registerHandler('database', () => {
      dbOperations.close();
    }, 10);

    gracefulShutdown.registerHandler('watcher', () => {
      if (activeWatcher) {
        activeWatcher.stop();
      }
    }, 5);

    logger.info('Graceful shutdown handlers registered');
  });
}

logger.info('[Server] Calling startServer()...');
startServer();

export default app;
