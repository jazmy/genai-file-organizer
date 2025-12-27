/**
 * Ollama Backward Compatibility Wrapper
 * This file maintains backward compatibility with existing code
 * while delegating to the new provider abstraction layer
 */

import { getProvider, resetProvider, getProviderType } from './providers/index.js';
import { loadConfig } from '../config/default.js';
import logger from '../utils/logger.js';
import { connectionManager } from './connectionManager.js';
import { rateLimiter, RateLimitError } from './rateLimiter.js';

const config = loadConfig();

// Configure rate limiter from config if available
if (config.rateLimit) {
  rateLimiter.configure(config.rateLimit);
}

// Initialize connection manager on module load
connectionManager.startHealthCheck();

// Export connection status for UI
export function getConnectionStatus() {
  return connectionManager.getStatus();
}

// Subscribe to connection events
export function onConnectionChange(callback) {
  connectionManager.on('connected', (data) => callback({ status: 'connected', ...data }));
  connectionManager.on('disconnected', (data) => callback({ status: 'disconnected', ...data }));
  connectionManager.on('reconnecting', (data) => callback({ status: 'reconnecting', ...data }));
  connectionManager.on('failed', (data) => callback({ status: 'failed', ...data }));
}

/**
 * Test connection using the current provider
 */
export async function testConnection(silent = false) {
  const provider = getProvider();
  return provider.testConnection(silent);
}

/**
 * Generate text using the current provider
 */
export async function generateText(prompt, options = {}) {
  const provider = getProvider();

  // Use connection manager for resilient requests
  return connectionManager.withRetry(async () => {
    return provider.generateText(prompt, options);
  }, options.retries || 3).catch(error => {
    logger.error(`Text generation failed: ${error.message}`);
    return { success: false, error: error.message };
  });
}

/**
 * Generate with vision using the current provider
 */
export async function generateWithVision(prompt, images, options = {}) {
  const provider = getProvider();

  // Use connection manager for resilient requests
  return connectionManager.withRetry(async () => {
    return provider.generateWithVision(prompt, images, options);
  }, options.retries || 3).catch(error => {
    logger.error(`Vision generation failed: ${error.message}`);
    return { success: false, error: error.message };
  });
}

/**
 * Chat using the current provider (if supported)
 */
export async function chat(messages, options = {}) {
  const provider = getProvider();

  if (typeof provider.chat !== 'function') {
    return { success: false, error: 'Chat not supported by current provider' };
  }

  try {
    return await provider.chat(messages, options);
  } catch (error) {
    logger.error(`Chat failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze file (convenience wrapper)
 */
export async function analyzeFile(prompt, imageBase64 = null) {
  if (imageBase64) {
    return generateWithVision(prompt, [imageBase64]);
  }
  return generateText(prompt);
}

// Export rate limiter functions for API access
export function getRateLimitStatus() {
  return rateLimiter.getStatus();
}

export function configureRateLimit(options) {
  rateLimiter.configure(options);
  return rateLimiter.getStatus();
}

export function onRateLimitEvent(callback) {
  rateLimiter.on('queued', (data) => callback({ event: 'queued', ...data }));
  rateLimiter.on('dequeued', (data) => callback({ event: 'dequeued', ...data }));
  rateLimiter.on('rejected', (data) => callback({ event: 'rejected', ...data }));
  rateLimiter.on('timeout', (data) => callback({ event: 'timeout', ...data }));
}

// Export provider management functions
export { resetProvider, getProviderType };
