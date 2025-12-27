import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { PassThrough } from 'stream';
import logger from './logger.js';

// Cache directory - stored in data folder alongside database
const CACHE_DIR = join(process.cwd(), 'data', 'preview-cache');

// Ensure cache directory exists
let cacheInitialized = false;
async function ensureCacheDir() {
  if (cacheInitialized) return;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    cacheInitialized = true;
    logger.info(`Preview cache directory: ${CACHE_DIR}`);
  } catch (err) {
    logger.error(`Failed to create cache directory: ${err.message}`);
  }
}

/**
 * Generate a cache key based on file inode and modification time
 * Using inode instead of path means:
 * - Cache survives file renames (inode stays same)
 * - Cache invalidates when content changes (mtime updates)
 */
function getCacheKey(fileStats) {
  const hash = crypto.createHash('sha256');
  // Use inode (unique file ID on disk) + mtime for cache key
  // This way renamed files still hit the cache
  hash.update(`${fileStats.ino}:${fileStats.mtime.getTime()}`);
  return hash.digest('hex');
}

/**
 * Get the cache file path for a given cache key
 */
function getCachePath(cacheKey) {
  // Use first 2 chars as subdirectory to avoid too many files in one folder
  const subdir = cacheKey.substring(0, 2);
  return join(CACHE_DIR, subdir, `${cacheKey}.png`);
}

/**
 * Check if a valid cache exists for the file
 * Returns the cache path if valid, null otherwise
 */
export async function getCachedPreview(filePath, fileStats) {
  await ensureCacheDir();
  
  const cacheKey = getCacheKey(fileStats);
  const cachePath = getCachePath(cacheKey);
  
  try {
    const cacheStats = await fs.stat(cachePath);
    // Cache is valid if it exists and source file hasn't been modified since
    if (cacheStats.isFile() && cacheStats.mtime >= fileStats.mtime) {
      logger.debug(`Cache hit for: ${filePath}`);
      return cachePath;
    }
  } catch (err) {
    // Cache doesn't exist
  }
  
  return null;
}

/**
 * Stream cached preview to response
 */
export function streamCachedPreview(cachePath, res) {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Preview-Cache', 'HIT');
  
  const readStream = createReadStream(cachePath);
  readStream.pipe(res);
  
  return new Promise((resolve, reject) => {
    readStream.on('end', resolve);
    readStream.on('error', reject);
  });
}

/**
 * Generate preview and simultaneously:
 * 1. Stream to response (for immediate display)
 * 2. Write to cache (for future requests)
 * 
 * Uses PassThrough stream to duplicate the data flow
 */
export async function generateAndCachePreview(filePath, fileStats, generateFn, res) {
  await ensureCacheDir();
  
  const cacheKey = getCacheKey(fileStats);
  const cachePath = getCachePath(cacheKey);
  
  // Ensure cache subdirectory exists
  const cacheSubdir = join(CACHE_DIR, cacheKey.substring(0, 2));
  await fs.mkdir(cacheSubdir, { recursive: true });
  
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Preview-Cache', 'MISS');
  
  try {
    // Generate the preview (returns buffer or stream)
    const result = await generateFn();
    
    if (Buffer.isBuffer(result)) {
      // For buffer results, write to cache and response in parallel
      const cachePromise = fs.writeFile(cachePath, result).catch(err => {
        logger.error(`Failed to write cache: ${err.message}`);
      });
      
      // Send response immediately, don't wait for cache
      res.send(result);
      
      // Wait for cache write in background
      await cachePromise;
      logger.debug(`Cached preview for: ${filePath}`);
    } else if (result && typeof result.pipe === 'function') {
      // For stream results, use PassThrough to duplicate stream
      const passThrough = new PassThrough();
      const cacheStream = createWriteStream(cachePath);
      
      // Pipe to both response and cache file simultaneously
      result.pipe(passThrough);
      passThrough.pipe(res);
      passThrough.pipe(cacheStream);
      
      await new Promise((resolve, reject) => {
        let resFinished = false;
        let cacheFinished = false;
        
        const checkDone = () => {
          if (resFinished && cacheFinished) resolve();
        };
        
        res.on('finish', () => { resFinished = true; checkDone(); });
        cacheStream.on('finish', () => { cacheFinished = true; checkDone(); });
        passThrough.on('error', reject);
        cacheStream.on('error', (err) => {
          logger.error(`Cache write error: ${err.message}`);
          cacheFinished = true;
          checkDone();
        });
      });
      
      logger.debug(`Cached preview for: ${filePath}`);
    }
  } catch (err) {
    // Clean up failed cache file
    await fs.unlink(cachePath).catch(() => {});
    throw err;
  }
}

/**
 * Clear all cached previews
 */
export async function clearCache() {
  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    cacheInitialized = false;
    await ensureCacheDir();
    logger.info('Preview cache cleared');
    return { success: true };
  } catch (err) {
    logger.error(`Failed to clear cache: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  await ensureCacheDir();
  
  let totalFiles = 0;
  let totalSize = 0;
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          totalFiles++;
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (err) {
      // Directory might not exist yet
    }
  }
  
  await scanDir(CACHE_DIR);
  
  return {
    cacheDir: CACHE_DIR,
    totalFiles,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
  };
}

export default {
  getCachedPreview,
  streamCachedPreview,
  generateAndCachePreview,
  clearCache,
  getCacheStats,
};
