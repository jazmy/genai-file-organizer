import { randomUUID } from 'crypto';
import { dbOperations } from '../db/database.js';
import { levenshteinDistance } from '../utils/levenshtein.js';
import logger from '../utils/logger.js';

/**
 * LoggerService - Core logging service for AI interactions, API calls, and errors.
 * Provides full transparency into all AI operations and user feedback tracking.
 */
class LoggerService {
  constructor() {
    this.enabled = true;
    this.logPrompts = true;
    this.logResponses = true;
    this.maxBodySize = 50000; // Increased to capture full prompts including regeneration context
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId() {
    return randomUUID();
  }

  /**
   * Generate a unique error ID
   */
  generateErrorId() {
    return `err_${randomUUID()}`;
  }

  /**
   * Truncate a string to the max body size
   */
  truncate(str, maxSize = this.maxBodySize) {
    if (!str) return str;
    if (typeof str !== 'string') {
      str = JSON.stringify(str);
    }
    if (str.length > maxSize) {
      return str.substring(0, maxSize) + '... [truncated]';
    }
    return str;
  }

  // ==================== AI LOGGING ====================

  /**
   * Start logging an AI request
   * @param {Object} fileInfo - File information { filePath, fileName, fileType, fileSize }
   * @param {string} batchId - Optional batch ID if part of batch processing
   * @returns {string} The request ID for this log entry
   */
  logAIRequest(fileInfo, batchId = null) {
    if (!this.enabled) return null;

    try {
      const requestId = this.generateRequestId();
      dbOperations.createAILog(requestId, fileInfo, batchId);
      logger.debug(`[LoggerService] Created AI log: ${requestId} for ${fileInfo.fileName}`);
      return requestId;
    } catch (error) {
      logger.error(`[LoggerService] Failed to create AI log: ${error.message}`);
      return null;
    }
  }

  /**
   * Log the categorization step results
   * @param {string} requestId - The request ID
   * @param {string} prompt - The prompt sent to the model
   * @param {string} response - The model's response
   * @param {string} category - The detected category (final, after validation)
   * @param {number} timeMs - Time taken in milliseconds
   * @param {string} model - The model used for categorization
   * @param {string} reasoning - The AI's reasoning for the category choice
   * @param {string} llmCategory - The raw category from LLM before validation
   */
  logCategorization(requestId, prompt, response, category, timeMs, model = null, reasoning = null, llmCategory = null) {
    if (!this.enabled || !requestId) return;

    try {
      dbOperations.updateAILogCategorization(
        requestId,
        this.logPrompts ? this.truncate(prompt) : null,
        this.logResponses ? this.truncate(response) : null,
        category,
        timeMs,
        model,
        reasoning,
        llmCategory
      );
      const categoryChanged = llmCategory && llmCategory !== category;
      logger.debug(`[LoggerService] Updated categorization for ${requestId}: ${category} (${timeMs}ms) model=${model || 'unknown'} reasoning=${reasoning ? 'yes' : 'no'}${categoryChanged ? ` [LLM said: ${llmCategory}]` : ''}`);
    } catch (error) {
      logger.error(`[LoggerService] Failed to log categorization: ${error.message}`);
    }
  }

  /**
   * Log the naming step results
   * @param {string} requestId - The request ID
   * @param {string} prompt - The prompt sent to the model
   * @param {string} response - The model's response
   * @param {string} suggestedName - The suggested filename
   * @param {number} timeMs - Time taken in milliseconds
   * @param {string} model - The model used for naming
   * @param {string} reasoning - The AI's reasoning for the filename choice
   */
  logNaming(requestId, prompt, response, suggestedName, timeMs, model = null, reasoning = null) {
    if (!this.enabled || !requestId) return;

    try {
      dbOperations.updateAILogNaming(
        requestId,
        this.logPrompts ? this.truncate(prompt) : null,
        this.logResponses ? this.truncate(response) : null,
        suggestedName,
        timeMs,
        model,
        reasoning
      );
      logger.debug(`[LoggerService] Updated naming for ${requestId}: ${suggestedName} (${timeMs}ms) model=${model || 'unknown'} reasoning=${reasoning ? 'yes' : 'no'}`);
    } catch (error) {
      logger.error(`[LoggerService] Failed to log naming: ${error.message}`);
    }
  }

  /**
   * Log validation results
   * @param {string} requestId - The request ID
   * @param {Object} validationResult - The validation result object
   * @param {number} validationResult.validationAttempts - Number of attempts
   * @param {boolean} validationResult.validationPassed - Whether validation passed
   * @param {string} validationResult.validationReason - Reason for pass/fail
   * @param {number} validationResult.validationTimeMs - Total validation time
   * @param {Array} validationResult.validationHistory - History of all attempts
   */
  logValidation(requestId, validationResult) {
    if (!this.enabled || !requestId) return;

    try {
      // Get the last attempt's prompt and response from history if available
      const history = validationResult.validationHistory || [];
      const lastAttempt = history[history.length - 1] || {};

      dbOperations.updateAILogValidation(requestId, {
        attempts: validationResult.validationAttempts || 0,
        passed: validationResult.validationPassed,
        prompt: this.logPrompts ? this.truncate(lastAttempt.prompt || validationResult.prompt) : null,
        response: this.logResponses ? this.truncate(lastAttempt.response || validationResult.response) : null,
        reason: validationResult.validationReason,
        suggestedFix: lastAttempt.suggestedFix || null,
        timeMs: validationResult.validationTimeMs || 0,
        model: lastAttempt.model || validationResult.model || null,
        history: history,
      });

      const status = validationResult.validationPassed ? 'PASSED' : 'FAILED';
      logger.debug(`[LoggerService] Updated validation for ${requestId}: ${status} after ${validationResult.validationAttempts} attempts`);
    } catch (error) {
      logger.error(`[LoggerService] Failed to log validation: ${error.message}`);
    }
  }

  /**
   * Log regeneration context (called when a file is being regenerated with user feedback)
   * @param {string} requestId - The AI log request ID
   * @param {boolean} isRegeneration - Whether this is a regeneration request
   * @param {string} feedback - User feedback on why the previous name was inadequate
   * @param {string} rejectedName - The name that was rejected
   */
  logRegeneration(requestId, isRegeneration, feedback = null, rejectedName = null) {
    if (!this.enabled || !requestId) return;

    try {
      dbOperations.updateAILogRegeneration(requestId, isRegeneration, feedback, rejectedName);
      if (isRegeneration) {
        logger.debug(`[LoggerService] Logged regeneration for ${requestId}: rejected="${rejectedName}", feedback="${feedback || 'none'}"`);
      }
    } catch (error) {
      logger.error(`[LoggerService] Failed to log regeneration: ${error.message}`);
    }
  }

  /**
   * Mark an AI request as complete
   */
  completeRequest(requestId, status, totalTimeMs, modelUsed, error = null) {
    if (!this.enabled || !requestId) return;

    try {
      const errorMessage = error ? (error.message || String(error)) : null;
      const errorStack = error && error.stack ? error.stack : null;
      dbOperations.completeAILog(requestId, status, totalTimeMs, modelUsed, errorMessage, errorStack);
      logger.debug(`[LoggerService] Completed AI log ${requestId}: ${status} (${totalTimeMs}ms)`);
    } catch (err) {
      logger.error(`[LoggerService] Failed to complete AI log: ${err.message}`);
    }
  }

  // ==================== API LOGGING ====================

  /**
   * Log an API call
   */
  logAPICall(logData) {
    if (!this.enabled) return null;

    try {
      const requestId = this.generateRequestId();
      const fullLogData = {
        requestId,
        method: logData.method,
        endpoint: logData.endpoint,
        requestBody: this.truncate(logData.requestBody),
        requestHeaders: this.truncate(logData.requestHeaders),
        statusCode: logData.statusCode,
        responseBody: this.truncate(logData.responseBody),
        responseTimeMs: logData.responseTimeMs,
        userAgent: logData.userAgent,
        ipAddress: logData.ipAddress,
        success: logData.statusCode >= 200 && logData.statusCode < 400,
        errorMessage: logData.errorMessage,
      };
      dbOperations.createAPILog(fullLogData);
      return requestId;
    } catch (error) {
      logger.error(`[LoggerService] Failed to log API call: ${error.message}`);
      return null;
    }
  }

  // ==================== ERROR LOGGING ====================

  /**
   * Log an error
   * @param {string} errorType - 'ai_error', 'api_error', 'system_error'
   * @param {string} message - Error message
   * @param {Error|string} error - Error object or stack trace
   * @param {Object} context - Additional context
   * @returns {string} The error ID
   */
  logError(errorType, message, error, context = {}) {
    if (!this.enabled) return null;

    try {
      const errorId = this.generateErrorId();
      const errorData = {
        errorId,
        requestId: context.requestId || null,
        errorType,
        errorCode: context.errorCode || null,
        errorMessage: message,
        errorStack: error && error.stack ? error.stack : (typeof error === 'string' ? error : null),
        context,
        filePath: context.filePath || null,
      };
      dbOperations.createErrorLog(errorData);
      logger.debug(`[LoggerService] Logged error: ${errorId} - ${message}`);
      return errorId;
    } catch (err) {
      logger.error(`[LoggerService] Failed to log error: ${err.message}`);
      return null;
    }
  }

  // ==================== FEEDBACK ====================

  /**
   * Record user feedback on a suggestion
   * @param {string} requestId - The AI log request ID
   * @param {string} action - 'accepted', 'edited', 'rejected', 'skipped'
   * @param {string} finalName - The final name the user chose (if different from suggested)
   */
  recordFeedback(requestId, action, finalName = null) {
    if (!this.enabled || !requestId) return;

    try {
      // Get the original suggestion to calculate edit distance
      const aiLog = dbOperations.getAILogById(requestId);
      let editDistance = null;

      if (action === 'edited' && finalName && aiLog && aiLog.suggested_name) {
        editDistance = levenshteinDistance(aiLog.suggested_name, finalName);
      } else if (action === 'accepted') {
        editDistance = 0;
      }

      dbOperations.recordAILogFeedback(requestId, action, finalName, editDistance);
      logger.debug(`[LoggerService] Recorded feedback for ${requestId}: ${action} (distance: ${editDistance})`);
    } catch (error) {
      logger.error(`[LoggerService] Failed to record feedback: ${error.message}`);
    }
  }

  /**
   * Record feedback by file path (alternative method when request ID isn't available)
   * If no AI log exists, creates one from processed_files data
   */
  recordFeedbackByFilePath(filePath, action, finalName = null) {
    try {
      let aiLog = dbOperations.getAILogByFilePath(filePath);

      // If no AI log exists, try to create one from processed_files
      if (!aiLog) {
        const processedFile = dbOperations.getProcessedFile(filePath);
        if (processedFile) {
          // Create an AI log entry from the processed file data
          const requestId = this.generateRequestId();
          const fileName = processedFile.original_name || filePath.split('/').pop();

          dbOperations.createAILog(requestId, {
            filePath: filePath,
            fileName: fileName,
            fileType: null,
            fileSize: null,
          }, null);

          // Update the AI log with available info from processed_files
          if (processedFile.category) {
            dbOperations.updateAILogCategorization(
              requestId,
              null, // prompt not available
              null, // response not available
              processedFile.category,
              0
            );
          }

          if (processedFile.suggested_name) {
            dbOperations.updateAILogNaming(
              requestId,
              null, // prompt not available
              null, // response not available
              processedFile.suggested_name,
              0
            );
          }

          // Mark as completed with 'imported' model to indicate this is backfilled data
          dbOperations.completeAILog(requestId, 'success', 0, 'imported', null, null);

          logger.info(`[LoggerService] Created AI log ${requestId} from processed_files for: ${filePath}`);
          aiLog = { request_id: requestId, suggested_name: processedFile.suggested_name };
        }
      }

      if (aiLog) {
        this.recordFeedback(aiLog.request_id, action, finalName);
        return true;
      }

      logger.warn(`[LoggerService] No AI log or processed file found for: ${filePath}`);
      return false;
    } catch (error) {
      logger.error(`[LoggerService] Failed to record feedback by file path: ${error.message}`);
      return false;
    }
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get AI logs with filtering and pagination
   */
  getAILogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    try {
      const logs = dbOperations.getAILogs(filters, pagination);
      const count = dbOperations.getAILogsCount(filters);
      return {
        logs,
        total: count,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(count / pagination.limit),
      };
    } catch (error) {
      logger.error(`[LoggerService] Failed to get AI logs: ${error.message}`);
      return { logs: [], total: 0, page: 1, limit: pagination.limit, totalPages: 0 };
    }
  }

  /**
   * Get a single AI log by request ID
   */
  getLogById(requestId) {
    try {
      return dbOperations.getAILogById(requestId);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get log by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get API logs with filtering and pagination
   */
  getAPILogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    try {
      const logs = dbOperations.getAPILogs(filters, pagination);
      const count = dbOperations.getAPILogsCount(filters);
      return {
        logs,
        total: count,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(count / pagination.limit),
      };
    } catch (error) {
      logger.error(`[LoggerService] Failed to get API logs: ${error.message}`);
      return { logs: [], total: 0, page: 1, limit: pagination.limit, totalPages: 0 };
    }
  }

  /**
   * Get error logs with filtering and pagination
   */
  getErrorLogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    try {
      const logs = dbOperations.getErrorLogs(filters, pagination);
      const count = dbOperations.getErrorLogsCount(filters);
      return {
        logs,
        total: count,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(count / pagination.limit),
      };
    } catch (error) {
      logger.error(`[LoggerService] Failed to get error logs: ${error.message}`);
      return { logs: [], total: 0, page: 1, limit: pagination.limit, totalPages: 0 };
    }
  }

  /**
   * Resolve an error
   */
  resolveError(errorId, resolutionNotes) {
    try {
      dbOperations.resolveError(errorId, resolutionNotes);
      return true;
    } catch (error) {
      logger.error(`[LoggerService] Failed to resolve error: ${error.message}`);
      return false;
    }
  }

  // ==================== STATS & ANALYTICS ====================

  /**
   * Get logging statistics
   */
  getStats(timeRange = 'all') {
    try {
      return dbOperations.getLogStats(timeRange);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Get prompt effectiveness metrics by category
   */
  getPromptEffectiveness(timeRange = 'all') {
    try {
      return dbOperations.getPromptEffectiveness(timeRange);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get prompt effectiveness: ${error.message}`);
      return [];
    }
  }

  /**
   * Get categories with low acceptance rates
   */
  getLowPerformingCategories(threshold = 50, timeRange = 'all') {
    try {
      return dbOperations.getLowPerformingCategories(threshold, timeRange);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get low performing categories: ${error.message}`);
      return [];
    }
  }

  /**
   * Get recent rejections and edits
   * @param {number} limit - Max number of rejections to return
   * @param {string} timeRange - '1h', '24h', '7d', '30d', 'all'
   */
  getRecentRejections(limit = 10, timeRange = 'all') {
    try {
      return dbOperations.getRecentRejections(limit, timeRange);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get recent rejections: ${error.message}`);
      return [];
    }
  }

  /**
   * Get regeneration statistics for effectiveness dashboard
   * @param {string} timeRange - '1h', '24h', '7d', '30d', 'all'
   * @returns {Object} Regeneration stats including overall, by category, and recent with feedback
   */
  getRegenerationStats(timeRange = 'all') {
    try {
      return dbOperations.getRegenerationStats(timeRange);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get regeneration stats: ${error.message}`);
      return { overall: null, byCategory: [], recentWithFeedback: [] };
    }
  }

  /**
   * Get model usage and effectiveness statistics
   * @param {string} timeRange - '1h', '24h', '7d', '30d', 'all'
   * @returns {Object} Model stats for categorization, naming, and overall
   */
  getModelStats(timeRange = 'all') {
    try {
      return dbOperations.getModelStats(timeRange);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get model stats: ${error.message}`);
      return { categorization: [], naming: [], overall: null };
    }
  }

  /**
   * Get feedback details by action type with pagination
   * @param {string} actionType - 'total', 'accepted', 'edited', 'rejected', 'skipped'
   * @param {string} timeRange - '1h', '24h', '7d', '30d', 'all'
   * @param {Object} pagination - { page, limit }
   */
  getFeedbackDetails(actionType, timeRange = 'all', pagination = { page: 1, limit: 50 }) {
    try {
      return dbOperations.getFeedbackDetails(actionType, timeRange, pagination);
    } catch (error) {
      logger.error(`[LoggerService] Failed to get feedback details: ${error.message}`);
      return { items: [], total: 0, page: 1, limit: pagination.limit, totalPages: 0 };
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up old logs
   */
  cleanupOldLogs(olderThanDays = 30) {
    try {
      const result = dbOperations.cleanupOldLogs(olderThanDays);
      logger.info(`[LoggerService] Cleaned up logs older than ${olderThanDays} days: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`[LoggerService] Failed to cleanup old logs: ${error.message}`);
      return null;
    }
  }

  /**
   * Clear all logs (manual cleanup)
   */
  clearAllLogs() {
    try {
      const result = dbOperations.clearAllLogs();
      logger.info(`[LoggerService] Cleared all logs: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`[LoggerService] Failed to clear all logs: ${error.message}`);
      return null;
    }
  }

  /**
   * Schedule automatic weekly cleanup (logs older than 7 days)
   */
  scheduleWeeklyCleanup() {
    // Run cleanup immediately on startup to clear old logs
    this.cleanupOldLogs(7);

    // Schedule cleanup to run every 24 hours
    setInterval(() => {
      logger.info('[LoggerService] Running scheduled weekly log cleanup...');
      this.cleanupOldLogs(7);
    }, 24 * 60 * 60 * 1000); // Run daily to clean up logs older than 7 days
  }
}

// Export singleton instance
export const loggerService = new LoggerService();
export default loggerService;
