/**
 * Graceful Shutdown Handler
 * Ensures all resources are properly cleaned up on server shutdown
 */

import logger from './logger.js';

class GracefulShutdown {
  constructor() {
    this.shutdownHandlers = [];
    this.isShuttingDown = false;
    this.shutdownTimeout = 30000; // 30 seconds max
    this.httpServer = null;
    this.io = null;

    // Bind methods
    this.shutdown = this.shutdown.bind(this);
    this.registerHandler = this.registerHandler.bind(this);
  }

  /**
   * Initialize with server instances
   */
  init(httpServer, io) {
    this.httpServer = httpServer;
    this.io = io;

    // Register signal handlers
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGHUP', () => this.shutdown('SIGHUP'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      let errorMessage;
      if (reason instanceof Error) {
        errorMessage = reason.stack || reason.message || 'Error with no message';
      } else if (reason === undefined || reason === null || reason === '') {
        errorMessage = 'Unknown rejection (no reason provided)';
      } else {
        errorMessage = String(reason) || 'Unknown rejection';
      }
      logger.error('Unhandled rejection:', errorMessage);
      // Don't shutdown on unhandled rejections, just log
    });

    logger.info('Graceful shutdown handler initialized');
  }

  /**
   * Register a cleanup handler to be called during shutdown
   */
  registerHandler(name, handler, priority = 10) {
    this.shutdownHandlers.push({ name, handler, priority });
    // Sort by priority (lower = earlier)
    this.shutdownHandlers.sort((a, b) => a.priority - b.priority);
    logger.debug(`Registered shutdown handler: ${name} (priority: ${priority})`);
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal:', signal);
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // 1. Stop accepting new connections
      if (this.httpServer) {
        logger.info('Stopping HTTP server from accepting new connections...');
        await new Promise((resolve) => {
          this.httpServer.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server:', err);
            } else {
              logger.info('HTTP server closed');
            }
            resolve();
          });
        });
      }

      // 2. Close WebSocket connections gracefully
      if (this.io) {
        logger.info('Closing WebSocket connections...');
        this.io.emit('server:shutdown', { message: 'Server is shutting down' });

        await new Promise((resolve) => {
          setTimeout(() => {
            this.io.close(() => {
              logger.info('WebSocket server closed');
              resolve();
            });
          }, 1000); // Give clients 1 second to receive the shutdown message
        });
      }

      // 3. Run registered cleanup handlers
      for (const { name, handler } of this.shutdownHandlers) {
        try {
          logger.info(`Running shutdown handler: ${name}`);
          await Promise.race([
            handler(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Handler ${name} timeout`)), 5000)
            ),
          ]);
          logger.info(`Shutdown handler completed: ${name}`);
        } catch (error) {
          logger.error(`Error in shutdown handler ${name}:`, error);
        }
      }

      logger.info('Graceful shutdown completed');
      clearTimeout(forceExitTimeout);
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  }

  /**
   * Check if server is shutting down
   */
  isShuttingDownNow() {
    return this.isShuttingDown;
  }

  /**
   * Set shutdown timeout
   */
  setShutdownTimeout(ms) {
    this.shutdownTimeout = ms;
  }
}

export const gracefulShutdown = new GracefulShutdown();
