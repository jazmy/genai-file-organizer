import { loggerService } from '../services/loggerService.js';
import { metricsService } from '../services/metricsService.js';

/**
 * Express middleware to automatically log all API calls.
 * Captures request details, response status, timing, and any errors.
 */
export function apiLoggerMiddleware(options = {}) {
  // Endpoints to exclude from logging (to avoid noise)
  const excludeEndpoints = options.excludeEndpoints || [
    '/api/health',
    '/api/ollama/status',
    '/api/logs', // Don't log log requests (meta!)
  ];

  // Max body size to log
  const maxBodySize = options.maxBodySize || 10000;

  return (req, res, next) => {
    // Skip excluded endpoints
    if (excludeEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
      return next();
    }

    const startTime = Date.now();

    // Capture request details
    const requestDetails = {
      method: req.method,
      endpoint: req.path,
      userAgent: req.get('user-agent') || '',
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    };

    // Safely stringify request body (truncate if too large)
    let requestBody = null;
    if (req.body && Object.keys(req.body).length > 0) {
      try {
        const bodyStr = JSON.stringify(req.body);
        requestBody = bodyStr.length > maxBodySize
          ? bodyStr.substring(0, maxBodySize) + '... [truncated]'
          : bodyStr;
      } catch {
        requestBody = '[Unable to stringify request body]';
      }
    }

    // Capture relevant headers (exclude sensitive ones)
    const safeHeaders = {};
    const headerKeys = ['content-type', 'accept', 'origin', 'referer'];
    headerKeys.forEach(key => {
      if (req.get(key)) {
        safeHeaders[key] = req.get(key);
      }
    });
    const requestHeaders = JSON.stringify(safeHeaders);

    // Override res.json to capture response
    const originalJson = res.json.bind(res);
    let responseBody = null;

    res.json = (body) => {
      try {
        const bodyStr = JSON.stringify(body);
        responseBody = bodyStr.length > maxBodySize
          ? bodyStr.substring(0, maxBodySize) + '... [truncated]'
          : bodyStr;
      } catch {
        responseBody = '[Unable to stringify response body]';
      }
      return originalJson(body);
    };

    // Log when response finishes
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Record API metrics for performance tracking
      metricsService.recordApiRequest(responseTime, !success);

      loggerService.logAPICall({
        ...requestDetails,
        requestBody,
        requestHeaders,
        statusCode: res.statusCode,
        responseBody,
        responseTimeMs: responseTime,
        success,
        errorMessage: success ? null : responseBody,
      });
    });

    next();
  };
}

export default apiLoggerMiddleware;
