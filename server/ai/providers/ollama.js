import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';
import { rateLimiter, RateLimitError } from '../rateLimiter.js';

/**
 * Ollama Provider
 * Implements LLM generation using Ollama's native API
 */
export class OllamaProvider extends EventEmitter {
  constructor(config = {}) {
    super();
    this.host = config.host || 'http://127.0.0.1:11434';
    this.model = config.model || 'qwen3-vl:8b';
    this.timeout = config.timeout || 120000;
    this.visionTimeout = config.visionTimeout || 180000;
    this.status = 'disconnected';
    this.models = [];
    this.hasLoggedConnection = false;
  }

  /**
   * Make a fetch request to Ollama API
   */
  async fetch(endpoint, body = null, options = {}) {
    const url = `${this.host}${endpoint}`;
    const fetchOptions = {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(silent = false) {
    try {
      if (!silent) {
        logger.info(`[OllamaProvider] Attempting to connect to Ollama at: ${this.host}`);
      }
      const data = await this.fetch('/api/tags', null, { timeout: 10000 });
      this.models = data.models || [];
      this.status = 'connected';

      if (!silent && !this.hasLoggedConnection) {
        logger.info(`[OllamaProvider] Connected to Ollama at ${this.host}`);
        logger.info(`[OllamaProvider] Available models: ${this.models.map((m) => m.name).join(', ')}`);
        this.hasLoggedConnection = true;
      }

      return { success: true, models: this.models };
    } catch (error) {
      this.status = 'disconnected';
      if (!silent) {
        logger.error(`[OllamaProvider] Failed to connect to Ollama: ${error.message}`);
      }
      this.hasLoggedConnection = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate text completion
   */
  async generateText(prompt, options = {}) {
    const { model = this.model, retries = 3, priority = 'normal' } = options;

    // Acquire rate limit token
    try {
      await rateLimiter.acquire(priority);
    } catch (error) {
      if (error instanceof RateLimitError) {
        logger.warn(`[OllamaProvider] Rate limited: ${error.message}`);
        return { success: false, error: error.message, rateLimited: true, retryAfter: error.retryAfter };
      }
      throw error;
    }

    try {
      logger.info(`[OllamaProvider] Generating text with model: ${model}`);

      const data = await this.fetch('/api/generate', {
        model,
        prompt: prompt + '\n\nRespond with ONLY the filename, nothing else. No explanation.',
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2000,
        },
      }, { timeout: this.timeout });

      logger.info(`[OllamaProvider] Response received: ${JSON.stringify(data).substring(0, 500)}`);

      const responseText = this.extractResponse(data);

      return {
        success: true,
        response: responseText.trim(),
        model: data.model,
        totalDuration: data.total_duration,
      };
    } catch (error) {
      logger.error(`[OllamaProvider] Text generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate with vision (image input)
   */
  async generateWithVision(prompt, images, options = {}) {
    const { model = this.model, retries = 3, priority = 'normal' } = options;

    // Acquire rate limit token
    try {
      await rateLimiter.acquire(priority);
    } catch (error) {
      if (error instanceof RateLimitError) {
        logger.warn(`[OllamaProvider] Rate limited: ${error.message}`);
        return { success: false, error: error.message, rateLimited: true, retryAfter: error.retryAfter };
      }
      throw error;
    }

    try {
      logger.info(`[OllamaProvider] Generating with vision, model: ${model}, images: ${images.length}`);

      const data = await this.fetch('/api/generate', {
        model,
        prompt: prompt + '\n\nRespond with ONLY the filename, nothing else. No explanation.',
        images,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2000,
        },
      }, { timeout: this.visionTimeout });

      logger.info(`[OllamaProvider] Vision response received: ${JSON.stringify(data).substring(0, 500)}`);

      const responseText = this.extractResponse(data);

      return {
        success: true,
        response: responseText.trim(),
        model: data.model,
        totalDuration: data.total_duration,
      };
    } catch (error) {
      logger.error(`[OllamaProvider] Vision generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract response text from Ollama API response
   * Handles models that use thinking/reasoning format
   */
  extractResponse(data) {
    let responseText = data.response || '';

    // If response is empty but we have thinking, extract from it
    if (!responseText && data.thinking) {
      const thinkingText = data.thinking;
      logger.info(`[OllamaProvider] Processing thinking: ${thinkingText.substring(0, 500)}`);

      // PRIORITY 1: Look for explicit filename patterns
      const explicitPatterns = [
        /(?:new|final|renamed?|suggested|output)\s*(?:filename|name)?[\s:]+[`"']?([a-z][a-z0-9_\-]+\.[a-z0-9]+)[`"']?/i,
        /(?:should be|would be|rename to|the filename is)[\s:]+[`"']?([a-z][a-z0-9_\-]+\.[a-z0-9]+)[`"']?/i,
      ];

      for (const pattern of explicitPatterns) {
        const match = thinkingText.match(pattern);
        if (match) {
          responseText = match[1];
          logger.info(`[OllamaProvider] Extracted explicit filename from thinking: ${responseText}`);
          break;
        }
      }

      // PRIORITY 2: Look at the last part after conclusion words
      if (!responseText) {
        const lastPartMatch = thinkingText.match(/(?:therefore|so|thus|finally|hence|the filename)[^]*$/i);
        const searchText = lastPartMatch ? lastPartMatch[0] : thinkingText.slice(-500);

        const filenamePattern = /\b((?:sticker|img|ss|doc|meme|design|infographic|photo|screenshot|note|report|invoice|form|data|code|audio|video|mail|receipt)_[a-z0-9][a-z0-9_\-]*\.[a-z0-9]+)\b/gi;
        const matches = [...searchText.matchAll(filenamePattern)];

        if (matches.length > 0) {
          responseText = matches[matches.length - 1][1];
          logger.info(`[OllamaProvider] Extracted filename from end of thinking: ${responseText}`);
        }
      }

      // PRIORITY 3: Standalone filename on its own line
      if (!responseText) {
        const standaloneMatch = thinkingText.match(/^([a-z]+_[a-z0-9_\-]+\.[a-z0-9]+)$/im);
        if (standaloneMatch) {
          responseText = standaloneMatch[1];
          logger.info(`[OllamaProvider] Extracted standalone filename from thinking: ${responseText}`);
        }
      }
    }

    // Last resort: find any valid filename in full response
    if (!responseText) {
      const fullText = (data.response || '') + (data.thinking || '');
      const filenamePattern = /\b((?:sticker|img|ss|doc|meme|design|infographic|photo|screenshot|note|report|invoice|form|data|code|audio|video|mail|receipt)_[a-z0-9][a-z0-9_\-]*\.[a-z0-9]+)\b/gi;
      const matches = [...fullText.matchAll(filenamePattern)];

      if (matches.length > 0) {
        responseText = matches[matches.length - 1][1];
        logger.info(`[OllamaProvider] Extracted filename from full text: ${responseText}`);
      }
    }

    return responseText;
  }

  /**
   * Chat completion (for future use)
   */
  async chat(messages, options = {}) {
    const { model = this.model } = options;

    try {
      const data = await this.fetch('/api/chat', {
        model,
        messages,
        stream: false,
        options: {
          temperature: 0.3,
        },
      }, { timeout: this.timeout });

      return {
        success: true,
        response: data.message.content.trim(),
        model: data.model,
      };
    } catch (error) {
      logger.error(`[OllamaProvider] Chat failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      status: this.status,
      models: this.models,
      host: this.host,
      model: this.model,
      provider: 'ollama',
    };
  }

  /**
   * Get available models
   */
  getModels() {
    return this.models;
  }

  /**
   * Get provider name
   */
  getName() {
    return 'ollama';
  }
}

export default OllamaProvider;
