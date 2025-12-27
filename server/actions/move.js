import { dirname, join, basename } from 'path';
import { moveFile, fileExists, getUniquePath } from '../utils/fileUtils.js';
import { promises as fs } from 'fs';
import logger from '../utils/logger.js';

export async function applyMove(filePath, destFolder, options = {}) {
  const { dryRun = false, overwrite = false, createDir = true, newName = null } = options;

  const fileName = newName || basename(filePath);
  let destPath = join(destFolder, fileName);

  logger.debug(`Moving: ${basename(filePath)} -> ${destPath}`);

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      originalPath: filePath,
      destPath,
      destFolder,
    };
  }

  if (createDir) {
    await fs.mkdir(destFolder, { recursive: true });
  }

  if (!overwrite && (await fileExists(destPath))) {
    destPath = await getUniquePath(destPath);
    logger.warn(`File exists, using unique name: ${basename(destPath)}`);
  }

  try {
    const result = await moveFile(filePath, destPath, { createDir, overwrite });

    return {
      success: true,
      originalPath: filePath,
      destPath: result.destPath,
      destFolder,
    };
  } catch (error) {
    logger.error(`Move failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      originalPath: filePath,
      destFolder,
    };
  }
}

export async function batchMove(files, options = {}) {
  const { dryRun = false, onProgress } = options;

  const results = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const { filePath, destFolder, newName } = files[i];

    const result = await applyMove(filePath, destFolder, { dryRun, newName });
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
  applyMove,
  batchMove,
};
