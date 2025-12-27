import { getProvider } from './providers/index.js';
import { dbOperations } from '../db/database.js';
import logger from '../utils/logger.js';
import { loggerService } from '../services/loggerService.js';
import { responseValidator } from './responseValidator.js';
import { generateFilenameWithValidation, getValidationSettings } from './filenameValidator.js';

// Parse JSON response from AI, handling markdown code blocks and malformed JSON
function parseJSONResponse(response) {
  if (!response || typeof response !== 'string') {
    return { success: false, error: 'Empty or invalid response' };
  }

  let cleaned = response.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed };
  } catch (e) {
    logger.debug(`[JSON PARSE] Failed to parse: ${cleaned.substring(0, 200)}`);
    return { success: false, error: e.message, raw: response };
  }
}

// Wrapper functions that use the current provider
async function generateText(prompt, options = {}) {
  const provider = getProvider();
  return provider.generateText(prompt, options);
}

async function generateWithVision(prompt, images, options = {}) {
  const provider = getProvider();
  return provider.generateWithVision(prompt, images, options);
}

// Get model for a specific step (categorization, naming, regeneration)
function getModelForStep(step) {
  const defaultModel = dbOperations.getSetting('ollama.model') || 'qwen3-vl:8b';
  const stepModel = dbOperations.getSetting(`ollama.model.${step}`);

  // If step-specific model is set and not empty, use it; otherwise use default
  const model = stepModel && stepModel.trim() ? stepModel : defaultModel;
  logger.debug(`[MODEL] Using model for ${step}: ${model}`);
  return model;
}

// Get all valid categories from the database (excludes system prompts like _categorization)
function getValidCategories() {
  try {
    const prompts = dbOperations.getAllPrompts();
    return prompts
      .filter(p => !p.category.startsWith('_'))
      .map(p => p.category);
  } catch (error) {
    logger.error(`Failed to load categories from database: ${error.message}`);
    return [];
  }
}

// Get the categorization prompt from the database, dynamically adding all valid categories
function getCategorizationPrompt() {
  try {
    const basePrompt = dbOperations.getPromptByCategory('_categorization');
    if (!basePrompt) {
      logger.warn('Categorization prompt not found in database');
      return null;
    }

    // Get all categories with their descriptions (excluding system prompts)
    const allPrompts = dbOperations.getAllPrompts();
    const categories = allPrompts
      .filter(p => !p.category.startsWith('_'))
      .map(p => ({
        name: p.category,
        description: p.description || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Build the category list
    const categoryList = categories
      .map(c => `- ${c.name}: ${c.description}`)
      .join('\n');

    // Concatenate base prompt with dynamic category list
    const fullPrompt = basePrompt.prompt + `

=== VALID CATEGORIES (Select ONLY from this list) ===
${categoryList}

CRITICAL: You MUST select a category from the list above. DO NOT create new categories.`;

    return fullPrompt;
  } catch (error) {
    logger.error(`Failed to load categorization prompt: ${error.message}`);
    return null;
  }
}

// Get a category-specific prompt from the database
function getCategoryPrompt(category) {
  try {
    const prompt = dbOperations.getPromptByCategory(category);
    if (prompt) {
      return prompt.prompt;
    }
    // Try to get a generic note prompt as fallback
    const fallback = dbOperations.getPromptByCategory('note');
    return fallback ? fallback.prompt : null;
  } catch (error) {
    logger.error(`Failed to load prompt for category ${category}: ${error.message}`);
    return null;
  }
}

// Get global naming rules that apply to all filetypes
function getGlobalNamingRules() {
  try {
    const prompt = dbOperations.getPromptByCategory('_global_naming_rules');
    if (prompt) {
      return prompt.prompt;
    }
    return null;
  } catch (error) {
    logger.error(`Failed to load global naming rules: ${error.message}`);
    return null;
  }
}

export async function categorizeFile(fileInfo, imageBase64 = null) {
  const { fileName, content, metadata } = fileInfo;
  const startTime = Date.now();

  logger.info(`[CHAIN STEP 1] Categorizing file: ${fileName}`);
  logger.info(`[CHAIN STEP 1] Has image: ${imageBase64 ? 'yes' : 'no'}, Content length: ${content?.length || 0}`);

  // Load categorization prompt from database
  const categorizationPrompt = getCategorizationPrompt();
  if (!categorizationPrompt) {
    logger.error('[CHAIN STEP 1] No categorization prompt found in database');
    return { category: 'note', prompt: null, response: null, timeMs: Date.now() - startTime };
  }

  let prompt = categorizationPrompt + `

File to categorize: ${fileName}
`;

  if (metadata) {
    prompt += `Metadata: ${JSON.stringify(metadata, null, 2)}
`;
  }

  if (content && content.trim()) {
    prompt += `
Content preview:
${content.substring(0, 2000)}
`;
  }

  prompt += `
Category:`;

  // Get the model for categorization step
  const categorizationModel = getModelForStep('categorization');
  logger.info(`[CHAIN STEP 1] Sending categorization request with model: ${categorizationModel}`);

  let result;
  if (imageBase64) {
    logger.info(`[CHAIN STEP 1] Using vision model for categorization`);
    result = await generateWithVision(prompt, [imageBase64], { model: categorizationModel });
  } else {
    logger.info(`[CHAIN STEP 1] Using text model for categorization`);
    result = await generateText(prompt, { model: categorizationModel });
  }

  const timeMs = Date.now() - startTime;
  logger.info(`[CHAIN STEP 1] Got response: ${JSON.stringify(result).substring(0, 300)}`);

  if (!result.success) {
    logger.error(`[CHAIN STEP 1] Categorization failed: ${result.error}`);
    return { category: 'note', prompt, response: result.error, timeMs, error: result.error, model: categorizationModel };
  }

  // Try to parse JSON response with reasoning
  let categoryFromJson = null;
  let reasoning = null;
  const jsonResult = parseJSONResponse(result.response);

  if (jsonResult.success && jsonResult.data) {
    categoryFromJson = jsonResult.data.category;
    reasoning = jsonResult.data.reasoning;
    logger.info(`[CHAIN STEP 1] Parsed JSON - category: ${categoryFromJson}, reasoning: ${reasoning?.substring(0, 100)}`);
  } else {
    logger.debug(`[CHAIN STEP 1] Could not parse JSON, falling back to text extraction`);
  }

  // Use validator for robust category parsing (use parsed category or raw response)
  const validation = responseValidator.validateCategory(categoryFromJson || result.response, {
    fileName,
    step: 'categorization',
  });

  if (validation.fallback) {
    logger.warn(`[CHAIN STEP 1] Category validation used fallback: ${validation.original || 'unknown'} -> ${validation.category}`);
  } else if (validation.matched || validation.synonym) {
    logger.info(`[CHAIN STEP 1] Category matched/synonym: ${categoryFromJson || result.response} -> ${validation.category}`);
  } else {
    logger.info(`[CHAIN STEP 1] Categorized as: ${validation.category}`);
  }

  return {
    category: validation.category,
    llmCategory: categoryFromJson || null, // The raw category from LLM before validation
    prompt,
    response: result.response,
    reasoning,
    timeMs,
    validationFallback: validation.fallback,
    model: categorizationModel,
  };
}

export async function generateFilename(fileInfo, category, imageBase64 = null, options = {}) {
  const { fileName, fileType, content, metadata } = fileInfo;
  const { isRegeneration = false, feedback = null, rejectedName = null } = options;
  const startTime = Date.now();

  const stepType = isRegeneration ? 'regeneration' : 'naming';
  logger.info(`[CHAIN STEP 2] Generating filename for category: ${category} (${stepType})`);

  // Load prompt from database
  const categoryPrompt = getCategoryPrompt(category);
  if (!categoryPrompt) {
    logger.error(`[CHAIN STEP 2] No prompt found for category: ${category}`);
    return { filename: null, prompt: null, response: null, timeMs: Date.now() - startTime };
  }

  // Load global naming rules (prepended to all category prompts)
  const globalRules = getGlobalNamingRules();

  logger.info(`[CHAIN STEP 2] Loaded prompt from database for category: ${category}`);
  if (globalRules) {
    logger.info(`[CHAIN STEP 2] Prepending global naming rules`);
  }

  // Build prompt: global rules first, then category-specific prompt
  let prompt = '';
  if (globalRules) {
    prompt = globalRules + '\n\n';
  }
  prompt += categoryPrompt + `

File to rename: ${fileName}
File type: ${fileType}
`;

  if (metadata) {
    prompt += `Metadata: ${JSON.stringify(metadata, null, 2)}
`;
  }

  if (content && content.trim()) {
    prompt += `
Content:
${content.substring(0, 3000)}
`;
  }

  // Add regeneration context if this is a regeneration request with feedback
  if (isRegeneration && rejectedName) {
    prompt += `
=== REGENERATION REQUEST ===
The user has REJECTED the previous suggested filename. You MUST generate a DIFFERENT filename.

REJECTED filename (DO NOT use this or anything similar): ${rejectedName}
`;
    if (feedback && feedback.trim()) {
      prompt += `
User feedback on why the rejected name was inadequate:
"${feedback}"

Use this feedback to generate a better filename that addresses the user's concerns.
`;
    } else {
      prompt += `
The user did not provide specific feedback, but they want a different naming approach.
Try to be more descriptive or use different aspects of the content.
`;
    }
    prompt += `
Generate a NEW filename that is meaningfully different from the rejected one.
`;
  }

  // Extract meaningful info from original filename
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
  const dateMatch2 = fileName.match(/(\d{8})/); // YYYYMMDD format
  // Month-year patterns like "November-2025", "Nov-2025", "november_2025"
  const monthYearMatch = fileName.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[-_\s]?(20\d{2}|19\d{2})/i);
  const yearMatch = fileName.match(/(^|[^0-9])(20\d{2}|19\d{2})([^0-9]|$)/); // Year only like "2024"

  // Check for meaningful words in filename (names, labels, identifiers)
  const meaningfulParts = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter(part => {
      // Filter out random strings, UUIDs, hashes
      if (part.length < 2) return false;
      if (/^[0-9a-f]{8,}$/i.test(part)) return false; // hex hashes
      if (/^\d+x\d+$/i.test(part)) return false; // dimensions like 600x600
      if (/^v?\d+$/i.test(part)) return false; // version numbers
      if (/^[A-Za-z0-9]{20,}$/.test(part)) return false; // long random strings
      // Keep words that look meaningful
      return /^[A-Za-z][A-Za-z0-9]*$/.test(part) && part.length >= 3;
    });

  if (meaningfulParts.length > 0) {
    prompt += `
IMPORTANT: The original filename contains these meaningful identifiers that should be PRESERVED in the new filename: ${meaningfulParts.join(', ')}
These may be names, labels, project names, or other important identifiers. Include them in your generated filename.
`;
  }

  // Add date instructions - prioritize original date, never add today's date if original exists
  // Check all date patterns and provide ONE clear instruction
  let foundDate = null;
  if (dateMatch) {
    foundDate = dateMatch[1];
  } else if (dateMatch2) {
    const d = dateMatch2[1];
    foundDate = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  } else if (monthYearMatch) {
    // Convert "November-2025" to "2025-11" format
    const monthNames = {
      'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
      'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
      'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
      'august': '08', 'aug': '08', 'september': '09', 'sep': '09',
      'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
      'december': '12', 'dec': '12'
    };
    const month = monthNames[monthYearMatch[1].toLowerCase()];
    const year = monthYearMatch[2];
    foundDate = `${year}-${month}`;
  } else if (yearMatch) {
    foundDate = yearMatch[2];
  }

  if (foundDate) {
    prompt += `
DATE ALREADY EXISTS IN FILENAME: ${foundDate}
You MUST use this date: ${foundDate}
DO NOT add any other date. DO NOT add today's date.
The filename should have ONLY ONE date: ${foundDate}
`;
  }

  // Get the model for naming or regeneration step
  const namingModel = getModelForStep(stepType);
  logger.info(`[CHAIN STEP 2] Sending filename generation request with model: ${namingModel}`);

  let result;
  if (imageBase64) {
    logger.info(`[CHAIN STEP 2] Using vision model`);
    result = await generateWithVision(prompt, [imageBase64], { model: namingModel });
  } else {
    logger.info(`[CHAIN STEP 2] Using text model`);
    result = await generateText(prompt, { model: namingModel });
  }

  const timeMs = Date.now() - startTime;
  logger.info(`[CHAIN STEP 2] Got response: ${JSON.stringify(result).substring(0, 300)}`);

  if (!result.success) {
    logger.error(`[CHAIN STEP 2] Filename generation failed: ${result.error}`);
    // Use validator to generate fallback
    const fallbackFilename = responseValidator.generateFallback(category, fileName, {
      error: result.error,
    });
    return {
      filename: fallbackFilename,
      prompt,
      response: result.error,
      timeMs,
      error: result.error,
      validationFallback: true,
      model: namingModel,
    };
  }

  // Try to parse JSON response with reasoning
  let filenameFromJson = null;
  let reasoning = null;
  const jsonResult = parseJSONResponse(result.response);

  if (jsonResult.success && jsonResult.data) {
    filenameFromJson = jsonResult.data.filename;
    reasoning = jsonResult.data.reasoning;
    logger.info(`[CHAIN STEP 2] Parsed JSON - filename: ${filenameFromJson}, reasoning: ${reasoning?.substring(0, 100)}`);
  } else {
    logger.debug(`[CHAIN STEP 2] Could not parse JSON, falling back to text extraction`);
  }

  // Use validator for robust filename parsing, sanitization, and prefix fixing
  const validationResult = responseValidator.validateAndFixFilename(
    filenameFromJson || result.response,
    fileName,
    category
  );

  const finalFilename = validationResult.filename;

  // Log what happened
  if (validationResult.fixType === 'sanitized') {
    logger.info(`[CHAIN STEP 2] Filename sanitized: ${validationResult.validation.original} -> ${finalFilename}`);
  } else if (validationResult.fixType === 'prefix_prepended') {
    logger.info(`[CHAIN STEP 2] Prepended prefix: ${validationResult.validation.filename} -> ${finalFilename}`);
  } else if (validationResult.fixType === 'fallback') {
    logger.warn(`[CHAIN STEP 2] Filename validation failed, using fallback: ${finalFilename}`);
  } else {
    logger.info(`[CHAIN STEP 2] Generated filename: ${finalFilename}`);
  }

  return {
    filename: finalFilename,
    prompt,
    response: result.response,
    reasoning,
    timeMs,
    validationFallback: validationResult.fixType === 'fallback',
    model: namingModel,
  };
}

export async function processFileChain(fileInfo, imageBase64 = null, options = {}) {
  const { batchId = null, filePath = null, fileSize = null, isRegeneration = false, feedback = null, rejectedName = null } = options;
  const startTime = Date.now();

  logger.info(`[CHAIN] Starting chain processing for: ${fileInfo.fileName}${isRegeneration ? ' (REGENERATION)' : ''}`);
  logger.info(`[CHAIN] Image provided: ${imageBase64 ? 'yes (' + imageBase64.length + ' chars)' : 'no'}`);

  // Get model info for logging - use regeneration model if applicable
  const stepType = isRegeneration ? 'regeneration' : 'naming';
  const modelUsed = getModelForStep(stepType);

  // Create AI log entry
  const requestId = loggerService.logAIRequest({
    filePath: filePath || fileInfo.fileName,
    fileName: fileInfo.fileName,
    fileType: fileInfo.fileType,
    fileSize: fileSize,
  }, batchId);

  // Log regeneration context if applicable
  if (requestId && isRegeneration) {
    loggerService.logRegeneration(requestId, true, feedback, rejectedName);
  }

  let categorizationResult = null;
  let namingResult = null;
  let error = null;

  try {
    // Step 1: Categorize
    logger.info(`[CHAIN] === STEP 1: CATEGORIZATION ===`);
    categorizationResult = await categorizeFile(fileInfo, imageBase64);
    logger.info(`[CHAIN] Category result: ${categorizationResult.category}`);

    // Log categorization step
    if (requestId) {
      loggerService.logCategorization(
        requestId,
        categorizationResult.prompt,
        categorizationResult.response,
        categorizationResult.category,
        categorizationResult.timeMs,
        categorizationResult.model,
        categorizationResult.reasoning,
        categorizationResult.llmCategory
      );
    }

    // Step 2: Generate filename with category-specific prompt (with validation loop)
    logger.info(`[CHAIN] === STEP 2: FILENAME GENERATION${isRegeneration ? ' (REGENERATION)' : ''} ===`);
    if (isRegeneration && feedback) {
      logger.info(`[CHAIN] Regeneration with user feedback: "${feedback}"`);
    }
    if (isRegeneration && rejectedName) {
      logger.info(`[CHAIN] Rejected name: ${rejectedName}`);
    }

    // Check if validation is enabled
    const validationSettings = getValidationSettings();
    const validationType = isRegeneration ? 'REGENERATION' : 'INITIAL GENERATION';
    logger.info(`[CHAIN] Validation enabled: ${validationSettings.enabled}, max retries: ${validationSettings.maxRetries}`);
    logger.info(`[CHAIN] Validation type: ${validationType}`);

    if (validationSettings.enabled) {
      // Use validation wrapper for filename generation with retry loop
      const generateFn = async (validationFeedback) => {
        // Combine validation feedback with any user feedback
        const combinedFeedback = validationFeedback
          ? (feedback ? `${feedback}. Also: ${validationFeedback}` : validationFeedback)
          : feedback;

        return await generateFilename(fileInfo, categorizationResult.category, imageBase64, {
          isRegeneration: isRegeneration || !!validationFeedback, // Treat validation retry as regeneration
          feedback: combinedFeedback,
          rejectedName: rejectedName,
        });
      };

      namingResult = await generateFilenameWithValidation(generateFn, {
        originalFilename: fileInfo.fileName,
        fileContent: fileInfo.content,
        category: categorizationResult.category,
        imageBase64,
      }, {
        maxRetries: validationSettings.maxRetries,
      });

      // Log validation attempts if any
      if (namingResult.validationAttempts) {
        logger.info(`[CHAIN] Validation attempts: ${namingResult.validationAttempts}`);
        if (namingResult.validationFailed) {
          logger.warn(`[CHAIN] Validation FAILED after ${namingResult.validationAttempts} attempts: ${namingResult.validationReason}`);
        } else if (namingResult.validationPassed) {
          logger.info(`[CHAIN] Validation PASSED on attempt ${namingResult.validationAttempts}`);
        }
      }
    } else {
      // Validation disabled - use direct generation
      namingResult = await generateFilename(fileInfo, categorizationResult.category, imageBase64, {
        isRegeneration,
        feedback,
        rejectedName,
      });
    }

    // Log naming step
    if (requestId) {
      loggerService.logNaming(
        requestId,
        namingResult.prompt,
        namingResult.response,
        namingResult.filename,
        namingResult.timeMs,
        namingResult.model,
        namingResult.reasoning
      );

      // Log validation step if validation was performed
      if (namingResult.validationAttempts) {
        loggerService.logValidation(requestId, {
          validationAttempts: namingResult.validationAttempts,
          validationPassed: namingResult.validationPassed,
          validationReason: namingResult.validationReason,
          validationTimeMs: namingResult.validationTimeMs,
          validationHistory: namingResult.validationHistory,
        });
      }
    }

    const totalTimeMs = Date.now() - startTime;
    logger.info(`[CHAIN] === COMPLETE ===`);
    logger.info(`[CHAIN] Final result - Category: ${categorizationResult.category}, Filename: ${namingResult.filename}`);

    // Complete the AI log
    if (requestId) {
      loggerService.completeRequest(requestId, 'success', totalTimeMs, modelUsed);
    }

    return {
      category: categorizationResult.category,
      filename: namingResult.filename,
      requestId,
      // Include validation metadata
      validationAttempts: namingResult.validationAttempts,
      validationFailed: namingResult.validationFailed,
      validationReason: namingResult.validationReason,
      validationPassed: namingResult.validationPassed,
    };
  } catch (err) {
    error = err;
    const totalTimeMs = Date.now() - startTime;
    logger.error(`[CHAIN] Error during processing: ${err.message}`);

    // Log the error
    if (requestId) {
      loggerService.completeRequest(requestId, 'error', totalTimeMs, modelUsed, err);
      loggerService.logError('ai_error', err.message, err, {
        requestId,
        filePath: filePath || fileInfo.fileName,
      });
    }

    // Return partial results if available
    return {
      category: categorizationResult?.category || 'note',
      filename: namingResult?.filename || null,
      requestId,
      error: err.message,
    };
  }
}

export default {
  categorizeFile,
  generateFilename,
  processFileChain,
};