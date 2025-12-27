import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';
import { rateLimiter, RateLimitError } from '../rateLimiter.js';

/**
 * llama-server Provider
 * Implements LLM generation using llama.cpp's OpenAI-compatible API
 * Supports parallel slots (-np) and continuous batching (-cb)
 */
export class LlamaServerProvider extends EventEmitter {
  constructor(config = {}) {
    super();
    this.host = config.host || 'http://127.0.0.1:8080';
    this.parallelSlots = config.parallelSlots || 4;
    this.timeout = config.timeout || 180000;
    this.status = 'disconnected';
    this.modelInfo = null;
    this.hasLoggedConnection = false;
  }

  /**
   * Make a fetch request to llama-server API
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
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`llama-server API error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  /**
   * Test connection to llama-server
   */
  async testConnection(silent = false) {
    try {
      if (!silent) {
        logger.info(`[LlamaServerProvider] Attempting to connect to llama-server at: ${this.host}`);
      }

      // llama-server provides /health endpoint
      const healthData = await this.fetch('/health', null, { timeout: 10000 });
      this.status = 'connected';

      // Try to get model info from /v1/models
      try {
        const modelsData = await this.fetch('/v1/models', null, { timeout: 5000 });
        this.modelInfo = modelsData.data?.[0] || { id: 'loaded-model' };
      } catch {
        // Some versions may not have /v1/models
        this.modelInfo = { id: 'loaded-model' };
      }

      // Try to get slots info from /slots endpoint
      let slotsInfo = null;
      try {
        slotsInfo = await this.fetch('/slots', null, { timeout: 5000 });
      } catch {
        // /slots might not be available
      }

      if (!silent && !this.hasLoggedConnection) {
        logger.info(`[LlamaServerProvider] Connected to llama-server at ${this.host}`);
        logger.info(`[LlamaServerProvider] Loaded model: ${this.modelInfo?.id || 'unknown'}`);
        if (slotsInfo) {
          logger.info(`[LlamaServerProvider] Parallel slots available: ${slotsInfo.length || this.parallelSlots}`);
        }
        this.hasLoggedConnection = true;
      }

      return {
        success: true,
        model: this.modelInfo,
        slots: slotsInfo,
        health: healthData,
      };
    } catch (error) {
      this.status = 'disconnected';
      if (!silent) {
        logger.error(`[LlamaServerProvider] Failed to connect to llama-server: ${error.message}`);
      }
      this.hasLoggedConnection = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate text completion using OpenAI-compatible API
   */
  async generateText(prompt, options = {}) {
    const { retries = 3, priority = 'normal' } = options;
    // Note: model option is ignored - llama-server uses the loaded model

    // Acquire rate limit token
    try {
      await rateLimiter.acquire(priority);
    } catch (error) {
      if (error instanceof RateLimitError) {
        logger.warn(`[LlamaServerProvider] Rate limited: ${error.message}`);
        return { success: false, error: error.message, rateLimited: true, retryAfter: error.retryAfter };
      }
      throw error;
    }

    try {
      logger.info(`[LlamaServerProvider] Generating text`);

      const data = await this.fetch('/v1/chat/completions', {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: false,
      }, { timeout: this.timeout });

      const responseText = this.extractResponse(data);

      logger.info(`[LlamaServerProvider] Text response: ${responseText.substring(0, 200)}`);

      return {
        success: true,
        response: responseText.trim(),
        model: data.model || 'llama-server',
        usage: data.usage,
      };
    } catch (error) {
      logger.error(`[LlamaServerProvider] Text generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate with vision (image input) using OpenAI-compatible vision format
   */
  async generateWithVision(prompt, images, options = {}) {
    const { retries = 3, priority = 'normal' } = options;

    // Acquire rate limit token
    try {
      await rateLimiter.acquire(priority);
    } catch (error) {
      if (error instanceof RateLimitError) {
        logger.warn(`[LlamaServerProvider] Rate limited: ${error.message}`);
        return { success: false, error: error.message, rateLimited: true, retryAfter: error.retryAfter };
      }
      throw error;
    }

    try {
      logger.info(`[LlamaServerProvider] Generating with vision, images: ${images.length}`);

      // Build content array with images FIRST, then text (LLaVA expects this order)
      const content = [];

      // Add images first in base64 format
      for (const imageBase64 of images) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
          },
        });
      }

      // Add text prompt after images
      content.push({
        type: 'text',
        text: prompt,
      });

      const data = await this.fetch('/v1/chat/completions', {
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: false,
      }, { timeout: this.timeout });

      const responseText = this.extractResponse(data);

      logger.info(`[LlamaServerProvider] Vision response: ${responseText.substring(0, 200)}`);

      return {
        success: true,
        response: responseText.trim(),
        model: data.model || 'llama-server',
        usage: data.usage,
      };
    } catch (error) {
      logger.error(`[LlamaServerProvider] Vision generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract response text from OpenAI-compatible API response
   */
  extractResponse(data) {
    let responseText = data.choices?.[0]?.message?.content || '';

    // Clean up the response - remove markdown code blocks if present
    if (responseText.includes('```')) {
      const codeBlockMatch = responseText.match(/```(?:\w*\n)?([\s\S]*?)```/);
      if (codeBlockMatch) {
        responseText = codeBlockMatch[1].trim();
      }
    }

    // Remove any "filename:" prefixes
    responseText = responseText.replace(/^(?:filename|name|result|output)[\s:]+/i, '').trim();

    // Remove quotes
    responseText = responseText.replace(/^["'`]|["'`]$/g, '');

    // If multi-line, try to find a valid filename
    if (responseText.includes('\n')) {
      const lines = responseText.split('\n').map(l => l.trim()).filter(Boolean);

      // Look for a line that looks like a filename
      for (const line of lines) {
        if (this.looksLikeFilename(line)) {
          responseText = line;
          break;
        }
      }
    }

    return responseText;
  }

  /**
   * Check if a string looks like a valid filename
   */
  looksLikeFilename(str) {
    if (!str || str.length < 3 || str.length > 200) return false;
    if (!str.includes('.')) return false;
    if (str.includes(' ')) return false;

    // Check for valid filename pattern
    return /^[a-z][a-z0-9_\-]*\.[a-z0-9]+$/i.test(str);
  }

  /**
   * Chat completion (for future use)
   */
  async chat(messages, options = {}) {
    try {
      const data = await this.fetch('/v1/chat/completions', {
        messages,
        temperature: 0.3,
        max_tokens: 2000,
        stream: false,
      }, { timeout: this.timeout });

      return {
        success: true,
        response: data.choices?.[0]?.message?.content?.trim() || '',
        model: data.model || 'llama-server',
        usage: data.usage,
      };
    } catch (error) {
      logger.error(`[LlamaServerProvider] Chat failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      status: this.status,
      model: this.modelInfo,
      host: this.host,
      parallelSlots: this.parallelSlots,
      provider: 'llama-server',
    };
  }

  /**
   * Get available models (llama-server uses a single loaded model)
   */
  getModels() {
    return this.modelInfo ? [this.modelInfo] : [];
  }

  /**
   * Get provider name
   */
  getName() {
    return 'llama-server';
  }
}

export default LlamaServerProvider;
