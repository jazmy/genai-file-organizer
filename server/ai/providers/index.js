import { OllamaProvider } from './ollama.js';
import { LlamaServerProvider } from './llamaServer.js';
import { dbOperations } from '../../db/database.js';
import logger from '../../utils/logger.js';

/**
 * Provider Factory
 * Returns the appropriate LLM provider based on settings
 */

let currentProvider = null;
let currentProviderType = null;

/**
 * Get the current LLM provider instance
 * Caches the provider and recreates if type changes
 */
export function getProvider() {
  const providerType = dbOperations.getSetting('provider.type') || 'ollama';

  // Return cached provider if type hasn't changed
  if (currentProvider && currentProviderType === providerType) {
    return currentProvider;
  }

  // Create new provider instance
  switch (providerType) {
    case 'llama-server':
      const llamaHost = dbOperations.getSetting('llamaServer.host') || 'http://127.0.0.1:8080';
      const llamaSlots = parseInt(dbOperations.getSetting('llamaServer.parallelSlots') || '4', 10);
      const llamaTimeout = parseInt(dbOperations.getSetting('llamaServer.timeout') || '180000', 10);

      currentProvider = new LlamaServerProvider({
        host: llamaHost,
        parallelSlots: llamaSlots,
        timeout: llamaTimeout,
      });
      logger.info(`[Provider] Initialized llama-server provider at ${llamaHost}`);
      break;

    case 'ollama':
    default:
      const ollamaHost = dbOperations.getSetting('ollama.host') || 'http://127.0.0.1:11434';
      const ollamaModel = dbOperations.getSetting('ollama.model') || 'qwen3-vl:8b';
      const ollamaTimeout = parseInt(dbOperations.getSetting('ollama.timeout') || '120000', 10);

      currentProvider = new OllamaProvider({
        host: ollamaHost,
        model: ollamaModel,
        timeout: ollamaTimeout,
      });
      logger.info(`[Provider] Initialized Ollama provider at ${ollamaHost}`);
      break;
  }

  currentProviderType = providerType;
  return currentProvider;
}

/**
 * Reset the cached provider (forces recreation on next getProvider call)
 */
export function resetProvider() {
  currentProvider = null;
  currentProviderType = null;
  logger.info('[Provider] Provider cache reset');
}

/**
 * Get the current provider type
 */
export function getProviderType() {
  return dbOperations.getSetting('provider.type') || 'ollama';
}

// Re-export provider classes for direct use if needed
export { OllamaProvider } from './ollama.js';
export { LlamaServerProvider } from './llamaServer.js';
