import { extractContent } from '../extractors/index.js';
import { parseFilenameResponse, validateFilename } from '../ai/parser.js';
import { processFileChain } from '../ai/chain.js';
import { getFileName, getFileExtension, getFileCategory, getFileStats } from '../utils/fileUtils.js';
import { loadConfig } from '../config/default.js';
import logger from '../utils/logger.js';
import { dbOperations } from '../db/database.js';

const config = loadConfig();

export async function processFile(filePath, options = {}) {
  const { isRegeneration = false, feedback = null, rejectedName = null } = options;
  const startTime = Date.now();
  const fileName = getFileName(filePath);
  const extension = getFileExtension(filePath);
  const category = getFileCategory(filePath);

  logger.info(`Processing: ${fileName}${isRegeneration ? ' (regeneration)' : ''}`);

  try {
    const stats = await getFileStats(filePath);

    if (config.processing.skipAudio && category === 'audio') {
      logger.info(`Skipping audio file: ${fileName}`);
      return { success: false, skipped: true, reason: 'Audio files skipped' };
    }

    if (config.processing.skipVideo && category === 'video') {
      logger.info(`Skipping video file: ${fileName}`);
      return { success: false, skipped: true, reason: 'Video files skipped' };
    }

    const extractionResult = await extractContent(filePath, {
      mode: category === 'audio' ? config.processing.audioMode : config.processing.videoMode,
      maxLength: config.processing.maxContentLength,
    });

    if (!extractionResult.success) {
      logger.error(`Extraction failed for ${fileName}: ${extractionResult.error}`);
      return {
        success: false,
        error: extractionResult.error,
        filePath,
        fileName,
      };
    }

    const fileInfo = {
      fileName,
      fileType: extension,
      category,
      content: extractionResult.content,
      metadata: extractionResult.metadata,
    };

    // Use chain processing (categorize first, then generate filename)
    const imageBase64 = extractionResult.imageBase64 || null;
    const chainResult = await processFileChain(fileInfo, imageBase64, {
      filePath,
      fileSize: stats?.size || null,
      isRegeneration,
      feedback,
      rejectedName,
    });

    if (!chainResult.filename) {
      logger.error(`Chain processing failed for ${fileName}`);
      return {
        success: false,
        error: 'Failed to generate filename',
        filePath,
        fileName,
      };
    }

    let suggestedName = parseFilenameResponse(chainResult.filename);
    const detectedCategory = chainResult.category;

    if (!suggestedName) {
      logger.error(`Failed to parse AI response for ${fileName}`);
      return {
        success: false,
        error: 'Failed to parse AI response',
        aiResponse: chainResult.filename,
        filePath,
        fileName,
      };
    }

    const validation = validateFilename(suggestedName);

    const processingTime = Date.now() - startTime;

    // Save to database for caching
    try {
      // Check if record exists for this file
      const existing = dbOperations.getProcessedFile(filePath);

      if (existing && isRegeneration) {
        // Update existing record when regenerating
        logger.info(`Updating existing record for regenerated file: ${fileName}`);
        dbOperations.updateProcessedFile(
          existing.id,
          suggestedName,
          null, // newPath is null until applied
          detectedCategory,
          'previewed'
        );
      } else {
        // Create new record
        dbOperations.saveProcessedFile(
          filePath,
          fileName,
          suggestedName,
          null, // newPath is null until applied
          detectedCategory,
          'previewed'
        );
      }
    } catch (dbError) {
      logger.warn(`Failed to save to database: ${dbError.message}`);
    }

    return {
      success: true,
      filePath,
      originalName: fileName,
      suggestedName,
      category: detectedCategory,
      extension,
      validation,
      metadata: extractionResult.metadata,
      stats,
      processingTime,
      aiResponse: chainResult.filename,
      // Validation loop metadata
      validationAttempts: chainResult.validationAttempts,
      validationFailed: chainResult.validationFailed,
      validationReason: chainResult.validationReason,
    };
  } catch (error) {
    logger.error(`Processing error for ${fileName}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      filePath,
      fileName,
    };
  }
}

export async function processFiles(filePaths, options = {}) {
  const { onProgress, batchSize = config.processing.batchSize, parallel = true, concurrency = 3 } = options;

  const total = filePaths.length;
  let completed = 0;

  if (parallel && filePaths.length > 1) {
    // Process files in parallel batches
    logger.info(`Processing ${total} files in parallel (concurrency: ${concurrency})`);
    
    const results = [];
    
    // Process in chunks of 'concurrency' size
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(async (filePath) => {
          const result = await processFile(filePath, options);
          completed++;
          
          if (onProgress) {
            onProgress({
              current: completed,
              total,
              result,
              progress: (completed / total) * 100,
            });
          }
          
          return result;
        })
      );
      
      results.push(...batchResults);
    }

    return {
      results,
      summary: {
        total,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success && !r.skipped).length,
        skipped: results.filter((r) => r.skipped).length,
      },
    };
  }

  // Sequential processing (original behavior)
  const results = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    const result = await processFile(filePath, options);
    results.push(result);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        result,
        progress: ((i + 1) / total) * 100,
      });
    }

    if (i < filePaths.length - 1) {
      await delay(config.processing.delayBetweenFiles);
    }
  }

  return {
    results,
    summary: {
      total,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
    },
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  processFile,
  processFiles,
};
