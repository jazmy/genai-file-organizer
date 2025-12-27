import { promises as fs } from 'fs';
import { extname, basename, dirname, join } from 'path';
import { loadConfig } from '../config/default.js';

const config = loadConfig();

export function getFileExtension(filePath) {
  return extname(filePath).toLowerCase();
}

export function getFileName(filePath) {
  return basename(filePath);
}

export function getFileNameWithoutExt(filePath) {
  const ext = extname(filePath);
  return basename(filePath, ext);
}

export function getFileCategory(filePath) {
  const ext = getFileExtension(filePath);
  const { supportedExtensions } = config;

  for (const [category, extensions] of Object.entries(supportedExtensions)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  return 'unknown';
}

export function isSupported(filePath) {
  const ext = getFileExtension(filePath);
  const allExtensions = Object.values(config.supportedExtensions).flat();
  return allExtensions.includes(ext);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
}

export async function readTextFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

export async function readBinaryFile(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    throw new Error(`Failed to read binary file: ${error.message}`);
  }
}

export async function renameFile(oldPath, newPath, options = {}) {
  const { dryRun = false, overwrite = false } = options;

  if (dryRun) {
    return { success: true, dryRun: true, oldPath, newPath };
  }

  if (!overwrite && (await fileExists(newPath))) {
    const uniquePath = await getUniquePath(newPath);
    newPath = uniquePath;
  }

  try {
    await fs.rename(oldPath, newPath);
    return { success: true, oldPath, newPath };
  } catch (error) {
    throw new Error(`Failed to rename file: ${error.message}`);
  }
}

export async function moveFile(sourcePath, destPath, options = {}) {
  const { dryRun = false, createDir = true, overwrite = false } = options;

  if (dryRun) {
    return { success: true, dryRun: true, sourcePath, destPath };
  }

  const destDir = dirname(destPath);

  if (createDir) {
    await fs.mkdir(destDir, { recursive: true });
  }

  if (!overwrite && (await fileExists(destPath))) {
    destPath = await getUniquePath(destPath);
  }

  try {
    await fs.rename(sourcePath, destPath);
    return { success: true, sourcePath, destPath };
  } catch (error) {
    if (error.code === 'EXDEV') {
      await fs.copyFile(sourcePath, destPath);
      await fs.unlink(sourcePath);
      return { success: true, sourcePath, destPath, copied: true };
    }
    throw new Error(`Failed to move file: ${error.message}`);
  }
}

export async function getUniquePath(filePath) {
  const dir = dirname(filePath);
  const ext = extname(filePath);
  const nameWithoutExt = basename(filePath, ext);

  let counter = 1;
  let newPath = filePath;

  while (await fileExists(newPath)) {
    newPath = join(dir, `${nameWithoutExt}_${counter}${ext}`);
    counter++;
  }

  return newPath;
}

export async function listFiles(dirPath, options = {}) {
  const { recursive = false, filter = null } = options;
  const files = [];

  async function scanDir(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);

      if (entry.isFile()) {
        if (!filter || filter(fullPath)) {
          files.push(fullPath);
        }
      } else if (entry.isDirectory() && recursive) {
        if (!entry.name.startsWith('.')) {
          await scanDir(fullPath);
        }
      }
    }
  }

  await scanDir(dirPath);
  return files;
}

export function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, config.naming.maxLength);
}

export function formatFileName(parts, extension) {
  const { separator, wordSeparator } = config.naming;

  const formatted = parts
    .filter(Boolean)
    .map((part) =>
      part
        .toLowerCase()
        .replace(/\s+/g, wordSeparator)
        .replace(/[^a-z0-9\-]/g, '')
    )
    .join(separator);

  return sanitizeFileName(formatted) + extension;
}
