import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { validateConfig } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultConfig = {
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3-vl:8b',
    timeout: 120000,
  },

  naming: {
    maxLength: 100,
    preserveExtension: true,
    dateFormat: 'YYYY-MM-DD',
    lowercase: true,
    separator: '_',
    wordSeparator: '-',
    prefixes: {
      document: 'doc',
      invoice: 'inv',
      screenshot: 'ss',
      image: 'img',
      scan: 'scan',
      code: 'code',
      log: 'log',
      note: 'note',
      legal: 'legal',
      tax: 'tax',
      bank: 'bank',
      meme: 'meme',
      art: 'art',
      book: 'book',
      id: 'id',
      video: 'vid',
      audio: 'aud',
      archive: 'zip',
      font: 'font',
      design: 'design',
      calendar: 'cal',
      spreadsheet: 'sheet',
      presentation: 'pres',
    },
  },

  folders: {
    enabled: false,
    createIfMissing: true,
    rules: [
      { type: 'invoice', destination: './Invoices' },
      { type: 'screenshot', destination: './Screenshots' },
      { type: 'document', destination: './Documents' },
      { type: 'image', destination: './Images' },
      { type: 'video', destination: './Videos' },
      { type: 'audio', destination: './Audio' },
      { type: 'code', destination: './Code' },
      { type: 'archive', destination: './Archives' },
    ],
  },

  watch: {
    enabled: false,
    directories: [],
    processedFolder: null,
    ignorePatterns: [
      '.*',
      '*.tmp',
      '*.temp',
      '~*',
      'Thumbs.db',
      '.DS_Store',
    ],
  },

  processing: {
    batchSize: parseInt(process.env.BATCH_SIZE) || 10,
    delayBetweenFiles: parseInt(process.env.DELAY_BETWEEN_FILES) || 500,
    maxContentLength: parseInt(process.env.MAX_CONTENT_LENGTH) || 25000,
    skipAudio: process.env.SKIP_AUDIO === 'true',
    skipVideo: process.env.SKIP_VIDEO === 'true',
    audioMode: process.env.AUDIO_MODE || 'metadata',
    videoMode: process.env.VIDEO_MODE || 'keyframes',
    dryRun: false,
  },

  server: {
    port: parseInt(process.env.PORT) || 3001,
    corsOrigins: ['http://localhost:3000'],
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: null,
  },

  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    maxTokens: parseInt(process.env.RATE_LIMIT_MAX_TOKENS) || 10,  // Burst capacity
    refillRate: parseInt(process.env.RATE_LIMIT_REFILL_RATE) || 2, // Tokens per second
    maxQueueSize: parseInt(process.env.RATE_LIMIT_MAX_QUEUE) || 100,
    requestTimeout: parseInt(process.env.RATE_LIMIT_TIMEOUT) || 60000,
  },

  supportedExtensions: {
    documents: ['.pdf', '.docx', '.doc', '.rtf', '.txt', '.html', '.md', '.srt'],
    spreadsheets: ['.xlsx', '.xls', '.csv', '.tsv', '.ods'],
    presentations: ['.pptx', '.ppt', '.odp'],
    code: ['.py', '.js', '.ts', '.json', '.jsx', '.tsx', '.css', '.html', '.xml', '.ipynb', '.sh', '.bash', '.zsh', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.sql', '.r', '.rb', '.go', '.rs', '.swift', '.kt', '.java', '.c', '.cpp', '.h', '.hpp'],
    images: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.heic', '.avif'],
    photoshop: ['.psd'],
    vector: ['.ai', '.svg', '.eps'],
    design: ['.xd', '.sketch', '.fig', '.figma'],
    icons: ['.ico', '.icns'],
    fonts: ['.ttf', '.otf', '.woff', '.woff2'],
    audio: ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'],
    video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'],
    archives: ['.zip', '.dmg', '.tar', '.gz', '.rar', '.7z'],
    calendar: ['.ics', '.ical'],
  },
};

// Cache for database config loader
let dbConfigLoader = null;

export function setDbConfigLoader(loader) {
  dbConfigLoader = loader;
}

export function loadConfig(configPath = null) {
  let userConfig = {};

  // Try to load from database first (if loader is set)
  if (dbConfigLoader) {
    try {
      const dbConfig = dbConfigLoader();
      if (dbConfig) {
        userConfig = dbConfig;
      }
    } catch (e) {
      console.warn(`Failed to load config from database: ${e.message}`);
    }
  }

  // Fall back to file-based config if database didn't provide settings
  if (Object.keys(userConfig).length === 0) {
    const possiblePaths = [
      configPath,
      join(process.cwd(), 'genorganize.config.json'),
      join(__dirname, '../../config/genorganize.config.json'),
    ].filter(Boolean);

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        try {
          const content = readFileSync(path, 'utf-8');
          userConfig = JSON.parse(content);
          break;
        } catch (e) {
          console.warn(`Failed to load config from ${path}: ${e.message}`);
        }
      }
    }
  }

  // Validate user config
  if (Object.keys(userConfig).length > 0) {
    const validation = validateConfig(userConfig);
    if (!validation.success) {
      console.warn('Config validation warnings:', validation.errors);
      // Still merge, but warn about issues
    }
  }

  return deepMerge(defaultConfig, userConfig);
}

/**
 * Validate a config object without loading
 * @param {object} config Config to validate
 * @returns {{ success: boolean, errors?: array }}
 */
export { validateConfig };

function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

export default defaultConfig;
