import { dirname, join, basename } from 'path';
import { renameFile, moveFile, listFiles, isSupported, fileExists } from '../utils/fileUtils.js';
import { processFile, processFiles } from './processor.js';
import { loadConfig } from '../config/default.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const config = loadConfig();

const history = [];

export async function organizeFile(filePath, options = {}) {
  const {
    dryRun = config.processing.dryRun,
    autoMove = config.folders.enabled,
    isRegeneration = false,
    feedback = null,
    rejectedName = null
  } = options;

  logger.info(`Organizing file: ${filePath}${isRegeneration ? ' (regeneration)' : ''}`);
  if (feedback) {
    logger.info(`User feedback provided: ${feedback}`);
  }
  if (rejectedName) {
    logger.info(`Rejected name: ${rejectedName}`);
  }

  const result = await processFile(filePath, { ...options, isRegeneration, feedback, rejectedName });

  if (!result.success) {
    return result;
  }

  const historyEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    originalPath: filePath,
    originalName: result.originalName,
    suggestedName: result.suggestedName,
    category: result.category,
    applied: false,
    dryRun,
  };

  if (dryRun) {
    logger.info(`[DRY RUN] Would rename: ${result.originalName} -> ${result.suggestedName}`);
    history.push(historyEntry);
    return {
      ...result,
      dryRun: true,
      historyId: historyEntry.id,
    };
  }

  const dir = dirname(filePath);
  let newPath = join(dir, result.suggestedName);

  if (autoMove) {
    const destFolder = getDestinationFolder(result.category, options);
    if (destFolder) {
      newPath = join(destFolder, result.suggestedName);
    }
  }

  try {
    const moveResult = await (autoMove && dirname(newPath) !== dir
      ? moveFile(filePath, newPath, { createDir: config.folders.createIfMissing })
      : renameFile(filePath, newPath));

    historyEntry.newPath = moveResult.newPath;
    historyEntry.applied = true;
    history.push(historyEntry);

    logger.info(`Renamed: ${result.originalName} -> ${basename(moveResult.newPath)}`);

    return {
      ...result,
      newPath: moveResult.newPath,
      historyId: historyEntry.id,
    };
  } catch (error) {
    logger.error(`Failed to rename ${filePath}: ${error.message}`);
    return {
      ...result,
      error: error.message,
      renameError: true,
    };
  }
}

export async function organizeDirectory(dirPath, options = {}) {
  const { recursive = false, filter = null, onProgress } = options;

  logger.info(`Organizing directory: ${dirPath} (recursive: ${recursive})`);

  const files = await listFiles(dirPath, {
    recursive,
    filter: (filePath) => {
      if (!isSupported(filePath)) return false;
      if (filter && !filter(filePath)) return false;
      return true;
    },
  });

  logger.info(`Found ${files.length} supported files`);

  const results = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];

    const result = await organizeFile(filePath, options);
    results.push(result);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        result,
        progress: ((i + 1) / total) * 100,
      });
    }

    if (i < files.length - 1 && config.processing.delayBetweenFiles > 0) {
      await delay(config.processing.delayBetweenFiles);
    }
  }

  return {
    results,
    summary: {
      total,
      successful: results.filter((r) => r.success && !r.dryRun).length,
      dryRun: results.filter((r) => r.dryRun).length,
      failed: results.filter((r) => !r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
    },
  };
}

export function getDestinationFolder(category, options = {}) {
  const { basePath = process.cwd() } = options;

  const rule = config.folders.rules.find((r) => r.type === category);

  if (rule) {
    return join(basePath, rule.destination);
  }

  return null;
}

export async function undoRename(historyId) {
  const entry = history.find((h) => h.id === historyId);

  if (!entry) {
    throw new Error(`History entry not found: ${historyId}`);
  }

  if (!entry.applied) {
    throw new Error('This rename was not applied (dry run)');
  }

  if (entry.undone) {
    throw new Error('This rename has already been undone');
  }

  const currentExists = await fileExists(entry.newPath);
  if (!currentExists) {
    throw new Error(`File no longer exists at: ${entry.newPath}`);
  }

  try {
    await renameFile(entry.newPath, entry.originalPath);
    entry.undone = true;
    entry.undoneAt = new Date().toISOString();

    logger.info(`Undone: ${basename(entry.newPath)} -> ${entry.originalName}`);

    return {
      success: true,
      originalPath: entry.originalPath,
      restoredFrom: entry.newPath,
    };
  } catch (error) {
    throw new Error(`Failed to undo rename: ${error.message}`);
  }
}

export function getHistory(options = {}) {
  const { limit = 100, includeUndone = false } = options;

  let filtered = history;

  if (!includeUndone) {
    filtered = filtered.filter((h) => !h.undone);
  }

  return filtered.slice(-limit).reverse();
}

export function clearHistory() {
  history.length = 0;
  logger.info('History cleared');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  organizeFile,
  organizeDirectory,
  getDestinationFolder,
  undoRename,
  getHistory,
  clearHistory,
};
