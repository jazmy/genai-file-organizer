import 'dotenv/config';

export { organizeFile, organizeDirectory, getHistory, undoRename } from './core/organizer.js';
export { processFile, processFiles } from './core/processor.js';
export { createWatcher, FileWatcher } from './core/watcher.js';
export { extractContent, getSupportedExtensions } from './extractors/index.js';
export { testConnection, generateText, generateWithVision } from './ai/ollama.js';
export { loadConfig } from './config/default.js';
export { applyRename, batchRename } from './actions/rename.js';
export { applyMove, batchMove } from './actions/move.js';
