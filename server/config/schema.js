import { z } from 'zod';

// Provider config schema
const providerSchema = z.object({
  type: z.enum(['ollama', 'llama-server']).default('ollama'),
}).partial();

// Ollama config schema
const ollamaSchema = z.object({
  host: z.string().url().default('http://127.0.0.1:11434'),
  model: z.string().min(1).default('qwen3-vl:8b'),
  timeout: z.number().int().positive().default(120000),
}).partial();

// llama-server config schema
const llamaServerSchema = z.object({
  host: z.string().url().default('http://127.0.0.1:8080'),
  parallelSlots: z.number().int().min(1).max(32).default(4),
  timeout: z.number().int().positive().default(180000),
}).partial();

// Naming config schema
const namingSchema = z.object({
  maxLength: z.number().int().min(10).max(255).default(100),
  preserveExtension: z.boolean().default(true),
  dateFormat: z.string().default('YYYY-MM-DD'),
  lowercase: z.boolean().default(true),
  separator: z.string().max(3).default('_'),
  wordSeparator: z.string().max(3).default('-'),
  prefixes: z.record(z.string()).optional(),
}).partial();

// Folder rule schema
const folderRuleSchema = z.object({
  type: z.string().min(1),
  destination: z.string().min(1),
});

// Folders config schema
const foldersSchema = z.object({
  enabled: z.boolean().default(false),
  createIfMissing: z.boolean().default(true),
  rules: z.array(folderRuleSchema).default([]),
}).partial();

// Watch config schema
const watchSchema = z.object({
  enabled: z.boolean().default(false),
  directories: z.array(z.string()).default([]),
  processedFolder: z.string().nullable().default(null),
  ignorePatterns: z.array(z.string()).default([]),
}).partial();

// Processing config schema
const processingSchema = z.object({
  batchSize: z.number().int().min(1).max(100).default(10),
  delayBetweenFiles: z.number().int().min(0).max(10000).default(500),
  maxContentLength: z.number().int().min(1000).max(100000).default(25000),
  skipAudio: z.boolean().default(false),
  skipVideo: z.boolean().default(false),
  audioMode: z.enum(['metadata', 'transcribe', 'skip']).default('metadata'),
  videoMode: z.enum(['keyframes', 'full', 'skip']).default('keyframes'),
  dryRun: z.boolean().default(false),
  parallelFiles: z.number().int().min(1).max(20).default(3),
  enableValidation: z.boolean().default(true),
  validationRetryCount: z.number().int().min(1).max(10).default(3),
}).partial();

// Server config schema
const serverSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3001),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
}).partial();

// Logging config schema
const loggingSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  file: z.string().nullable().default(null),
}).partial();

// Rate limit config schema
const rateLimitSchema = z.object({
  enabled: z.boolean().default(true),
  maxTokens: z.number().int().min(1).max(100).default(10),
  refillRate: z.number().int().min(1).max(100).default(2),
  maxQueueSize: z.number().int().min(1).max(1000).default(100),
  requestTimeout: z.number().int().min(1000).max(600000).default(60000),
}).partial();

// UI config schema
const uiSchema = z.object({
  defaultPath: z.string().default('/'),
  theme: z.enum(['light', 'dark']).default('dark'),
  folderShortcuts: z.array(z.object({
    name: z.string().min(1),
    path: z.string().min(1),
  })).default([]),
}).partial();

// Supported extensions schema
const supportedExtensionsSchema = z.object({
  documents: z.array(z.string()).optional(),
  spreadsheets: z.array(z.string()).optional(),
  presentations: z.array(z.string()).optional(),
  code: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  design: z.array(z.string()).optional(),
  icons: z.array(z.string()).optional(),
  fonts: z.array(z.string()).optional(),
  audio: z.array(z.string()).optional(),
  video: z.array(z.string()).optional(),
  archives: z.array(z.string()).optional(),
  calendar: z.array(z.string()).optional(),
}).partial();

// Complete config schema
export const configSchema = z.object({
  provider: providerSchema.optional(),
  ollama: ollamaSchema.optional(),
  llamaServer: llamaServerSchema.optional(),
  naming: namingSchema.optional(),
  folders: foldersSchema.optional(),
  watch: watchSchema.optional(),
  processing: processingSchema.optional(),
  server: serverSchema.optional(),
  logging: loggingSchema.optional(),
  rateLimit: rateLimitSchema.optional(),
  ui: uiSchema.optional(),
  supportedExtensions: supportedExtensionsSchema.optional(),
}).strict();

/**
 * Validate config object against schema
 * @param {object} config - Config object to validate
 * @returns {{ success: boolean, data?: object, errors?: array }}
 */
export function validateConfig(config) {
  try {
    const result = configSchema.safeParse(config);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: [{ path: '', message: error.message, code: 'UNKNOWN' }],
    };
  }
}

/**
 * Validate and merge config with defaults
 * @param {object} userConfig - User config to validate and merge
 * @param {object} defaults - Default config
 * @returns {{ success: boolean, config?: object, errors?: array }}
 */
export function validateAndMergeConfig(userConfig, defaults) {
  const result = validateConfig(userConfig);
  if (!result.success) {
    return result;
  }

  // Deep merge with defaults
  const merged = deepMerge(defaults, result.data);
  return { success: true, config: merged };
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  return result;
}

export default configSchema;
