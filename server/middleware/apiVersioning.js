/**
 * API Versioning Middleware
 * Supports version prefixes and provides backward compatibility
 */

export const API_VERSION = '1';
export const API_VERSION_HEADER = 'X-API-Version';

/**
 * Middleware that handles API versioning
 * - Supports /api/v1/... routes (explicit versioning)
 * - Falls back to /api/... for backward compatibility
 * - Sets response header with API version
 */
export function apiVersioning() {
  return (req, res, next) => {
    // Set API version header in response
    res.setHeader(API_VERSION_HEADER, API_VERSION);

    // Check for versioned route
    const versionMatch = req.path.match(/^\/api\/v(\d+)\//);

    if (versionMatch) {
      const requestedVersion = versionMatch[1];
      req.apiVersion = requestedVersion;

      // Rewrite path to remove version prefix for internal routing
      // e.g., /api/v1/files -> /api/files
      req.url = req.url.replace(`/api/v${requestedVersion}`, '/api');
    } else {
      // Default to current version for non-versioned routes
      req.apiVersion = API_VERSION;
    }

    next();
  };
}

/**
 * Creates versioned route handler
 * Routes can specify which versions they support
 */
export function versionedRoute(handlers) {
  return (req, res, next) => {
    const version = req.apiVersion || API_VERSION;
    const handler = handlers[`v${version}`] || handlers.default;

    if (handler) {
      return handler(req, res, next);
    }

    // Version not supported
    res.status(400).json({
      success: false,
      error: `API version ${version} not supported for this endpoint`,
      supportedVersions: Object.keys(handlers)
        .filter((k) => k !== 'default')
        .map((k) => k.replace('v', '')),
    });
  };
}

/**
 * Deprecation middleware - warns about deprecated endpoints
 */
export function deprecatedEndpoint(message, sunsetDate) {
  return (req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate || 'TBD');
    res.setHeader('X-Deprecation-Notice', message);

    console.warn(
      `[DEPRECATED] ${req.method} ${req.path} - ${message}`
    );

    next();
  };
}

/**
 * Get API info endpoint handler
 */
export function getApiInfo() {
  return {
    version: API_VERSION,
    name: 'GenOrganize API',
    description: 'AI-powered file organization API',
    endpoints: {
      files: '/api/files',
      process: '/api/process',
      config: '/api/config',
      system: '/api/system',
      health: '/api/health',
    },
    versioning: {
      current: API_VERSION,
      supported: [API_VERSION],
      headerName: API_VERSION_HEADER,
      format: '/api/v{version}/...',
    },
  };
}
