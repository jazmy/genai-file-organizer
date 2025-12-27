import { dirname, join, basename } from 'path';
import { renameFile, fileExists, getUniquePath } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function applyRename(filePath, newName, options = {}) {
  const { dryRun = false, overwrite = false } = options;

  const dir = dirname(filePath);
  let newPath = join(dir, newName);

  logger.debug(`Renaming: ${basename(filePath)} -> ${newName}`);

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      originalPath: filePath,
      newPath,
      originalName: basename(filePath),
      newName,
    };
  }

  if (!overwrite && (await fileExists(newPath))) {
    newPath = await getUniquePath(newPath);
    logger.warn(`File exists, using unique name: ${basename(newPath)}`);
  }

  try {
    const result = await renameFile(filePath, newPath, { overwrite });

    return {
      success: true,
      originalPath: filePath,
      newPath: result.newPath,
      originalName: basename(filePath),
      newName: basename(result.newPath),
    };
  } catch (error) {
    logger.error(`Rename failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      originalPath: filePath,
      newName,
    };
  }
}

export async function batchRename(files, options = {}) {
  const { dryRun = false, onProgress } = options;

  const results = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const { filePath, newName } = files[i];

    const result = await applyRename(filePath, newName, { dryRun });
    results.push(result);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        result,
        progress: ((i + 1) / total) * 100,
      });
    }
  }

  return {
    results,
    summary: {
      total,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}

export default {
  applyRename,
  batchRename,
};
