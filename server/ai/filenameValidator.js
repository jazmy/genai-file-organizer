import { generateText, generateWithVision } from './ollama.js';
import { dbOperations } from '../db/database.js';
import logger from '../utils/logger.js';

/**
 * Filename Validator
 * Uses AI to validate generated filenames against quality criteria
 * Implements retry loop with feedback for failed validations
 */

// Valid prefixes that filenames must start with
const VALID_PREFIXES = [
  'note', 'report', 'photo', 'img', 'invoice', 'receipt', 'screenshot', 'infographic',
  'meme', 'sticker', 'design', 'mail', 'form', 'data', 'code', 'audio', 'video',
  'prd', 'meeting_notes', 'strategy', 'plan', 'proposal', 'guide', 'memo',
  'research', 'transcript', 'template', 'feedback', 'announcement', 'training',
  'newsletter', 'draft', 'prompt', 'job_posting', 'invitation', 'essay', 'document',
];

/**
 * Get the model to use for validation (uses regeneration model - typically more advanced)
 */
function getValidationModel() {
  const defaultModel = dbOperations.getSetting('ollama.model') || 'qwen3-vl:8b';
  const validationModel = dbOperations.getSetting('ollama.model.regeneration');
  return validationModel && validationModel.trim() ? validationModel : defaultModel;
}

/**
 * Get validation settings from database
 */
export function getValidationSettings() {
  const enableValidation = dbOperations.getSetting('processing.enableValidation');
  const retryCount = dbOperations.getSetting('processing.validationRetryCount');

  return {
    enabled: enableValidation !== 'false', // Default to true
    maxRetries: parseInt(retryCount) || 3,
  };
}

/**
 * Get the validation prompt from database
 */
function getValidationPromptTemplate() {
  try {
    const prompt = dbOperations.getPromptByCategory('_filename_validation');
    if (prompt) {
      return prompt.prompt;
    }
    logger.warn('[VALIDATION] Validation prompt not found in database, using default');
  } catch (error) {
    logger.error(`[VALIDATION] Failed to load validation prompt: ${error.message}`);
  }
  // Fallback default
  return `You are a filename quality validator. Check if the generated filename meets quality criteria.
Respond with JSON: {"valid": true/false, "reason": "explanation", "suggestedFix": "if invalid"}`;
}

/**
 * Build the validation prompt
 */
function buildValidationPrompt(params) {
  const {
    originalFilename,
    generatedFilename,
    fileContent,
    category,
    appliedPrompt,
    previousFailures = [],
  } = params;

  // Load the validation prompt template from database
  const validationTemplate = getValidationPromptTemplate();

  let prompt = `${validationTemplate}

=== FILE BEING VALIDATED ===

ORIGINAL FILENAME: ${originalFilename}
GENERATED FILENAME: ${generatedFilename}
DETECTED CATEGORY: ${category}

FILE CONTENT PREVIEW:
${fileContent ? fileContent.substring(0, 1500) : '(no text content available)'}

PROMPT THAT WAS USED TO GENERATE THE FILENAME:
${appliedPrompt || '(not available)'}

VALID PREFIXES: ${VALID_PREFIXES.slice(0, 15).join('_, ')}_, etc.
`;

  if (previousFailures.length > 0) {
    prompt += `
PREVIOUS VALIDATION FAILURES (this is attempt ${previousFailures.length + 1}):
${previousFailures.map((f, i) => `Attempt ${i + 1}: ${f.reason}`).join('\n')}

The filename generator has already tried ${previousFailures.length} time(s) and failed validation.
Be thorough but also reasonable - if the filename is close to correct, consider passing it.
`;
  }

  return prompt;
}

/**
 * Parse the validation response from AI
 */
function parseValidationResponse(response) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        valid: parsed.valid === true,
        reason: parsed.reason || 'No reason provided',
        checks: parsed.checks || {},
        suggestedFix: parsed.suggestedFix || null,
      };
    }
  } catch (e) {
    logger.warn(`[VALIDATION] Failed to parse validation response: ${e.message}`);
  }

  // If parsing fails, try to determine validity from text
  const lowerResponse = response.toLowerCase();
  const isValid = lowerResponse.includes('"valid": true') ||
                  lowerResponse.includes('"valid":true') ||
                  (lowerResponse.includes('valid') && !lowerResponse.includes('invalid'));

  return {
    valid: isValid,
    reason: 'Could not parse structured response',
    checks: {},
    suggestedFix: null,
  };
}

/**
 * Validate a generated filename using AI
 * @param {Object} params - Validation parameters
 * @param {string} params.originalFilename - Original filename
 * @param {string} params.generatedFilename - AI-generated filename
 * @param {string} params.fileContent - File content preview
 * @param {string} params.category - Detected category
 * @param {string} params.appliedPrompt - Prompt used to generate filename
 * @param {string|null} params.imageBase64 - Image data if available
 * @param {Array} params.previousFailures - Previous validation failures
 * @returns {Promise<Object>} Validation result
 */
export async function validateFilenameWithAI(params) {
  const {
    originalFilename,
    generatedFilename,
    fileContent,
    category,
    appliedPrompt,
    imageBase64 = null,
    previousFailures = [],
  } = params;

  const startTime = Date.now();
  const model = getValidationModel();
  const attemptNumber = previousFailures.length + 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION ATTEMPT START
  // ═══════════════════════════════════════════════════════════════════════════
  logger.info(`[AUTO-VALIDATION] ┌─────────────────────────────────────────────────────────────┐`);
  logger.info(`[AUTO-VALIDATION] │ VALIDATION ATTEMPT ${attemptNumber}                                         │`);
  logger.info(`[AUTO-VALIDATION] └─────────────────────────────────────────────────────────────┘`);
  logger.info(`[AUTO-VALIDATION] File: "${originalFilename}"`);
  logger.info(`[AUTO-VALIDATION] Generated Name: "${generatedFilename}"`);
  logger.info(`[AUTO-VALIDATION] Category: ${category}`);
  logger.info(`[AUTO-VALIDATION] Model: ${model}`);
  logger.info(`[AUTO-VALIDATION] Has Image: ${imageBase64 ? 'yes' : 'no'}`);

  if (previousFailures.length > 0) {
    logger.info(`[AUTO-VALIDATION] Previous failures: ${previousFailures.length}`);
    previousFailures.forEach((f, i) => {
      logger.info(`[AUTO-VALIDATION]   └─ Attempt ${i + 1}: ${f.reason}`);
      if (f.suggestedFix) {
        logger.info(`[AUTO-VALIDATION]      Suggestion: ${f.suggestedFix}`);
      }
    });
  }

  const prompt = buildValidationPrompt({
    originalFilename,
    generatedFilename,
    fileContent,
    category,
    appliedPrompt,
    previousFailures,
  });

  // Log the full validation prompt
  logger.info(`[AUTO-VALIDATION] ┌─── VALIDATION PROMPT SENT ───────────────────────────────────`);
  // Split prompt into lines and log each (truncate very long prompts)
  const promptLines = prompt.split('\n');
  const maxLines = 50;
  promptLines.slice(0, maxLines).forEach(line => {
    logger.info(`[AUTO-VALIDATION] │ ${line}`);
  });
  if (promptLines.length > maxLines) {
    logger.info(`[AUTO-VALIDATION] │ ... (${promptLines.length - maxLines} more lines truncated)`);
  }
  logger.info(`[AUTO-VALIDATION] └──────────────────────────────────────────────────────────────`);

  let result;
  try {
    logger.info(`[AUTO-VALIDATION] Sending validation request to ${model}...`);
    if (imageBase64) {
      result = await generateWithVision(prompt, [imageBase64], { model });
    } else {
      result = await generateText(prompt, { model });
    }
  } catch (error) {
    logger.error(`[AUTO-VALIDATION] ✗ AI call failed: ${error.message}`);
    return {
      valid: false,
      reason: `Validation AI call failed: ${error.message}`,
      checks: {},
      suggestedFix: null,
      timeMs: Date.now() - startTime,
      model,
      attempt: attemptNumber,
      error: true,
      prompt,
    };
  }

  const timeMs = Date.now() - startTime;

  if (!result.success) {
    logger.error(`[AUTO-VALIDATION] ✗ Validation request failed: ${result.error}`);
    return {
      valid: false,
      reason: result.error,
      checks: {},
      suggestedFix: null,
      timeMs,
      model,
      attempt: attemptNumber,
      error: true,
      prompt,
    };
  }

  // Log the full AI response
  logger.info(`[AUTO-VALIDATION] ┌─── AI RESPONSE RECEIVED ─────────────────────────────────────`);
  const responseLines = (result.response || '').split('\n');
  responseLines.forEach(line => {
    logger.info(`[AUTO-VALIDATION] │ ${line}`);
  });
  logger.info(`[AUTO-VALIDATION] └──────────────────────────────────────────────────────────────`);

  const validation = parseValidationResponse(result.response);

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION RESULT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  logger.info(`[AUTO-VALIDATION] ┌─── VALIDATION RESULT ────────────────────────────────────────`);
  logger.info(`[AUTO-VALIDATION] │ Status: ${validation.valid ? '✓ PASSED' : '✗ FAILED'}`);
  logger.info(`[AUTO-VALIDATION] │ Reason: ${validation.reason}`);
  logger.info(`[AUTO-VALIDATION] │ Time: ${timeMs}ms`);

  if (validation.checks && Object.keys(validation.checks).length > 0) {
    logger.info(`[AUTO-VALIDATION] │ Checks:`);
    Object.entries(validation.checks).forEach(([key, value]) => {
      logger.info(`[AUTO-VALIDATION] │   ${value ? '✓' : '✗'} ${key}`);
    });
  }

  if (!validation.valid && validation.suggestedFix) {
    logger.info(`[AUTO-VALIDATION] │ Suggested Fix: ${validation.suggestedFix}`);
  }
  logger.info(`[AUTO-VALIDATION] └──────────────────────────────────────────────────────────────`);

  return {
    ...validation,
    timeMs,
    model,
    attempt: attemptNumber,
    prompt,
    response: result.response,
  };
}

/**
 * Generate filename with validation loop
 * Retries generation with feedback if validation fails
 *
 * @param {Function} generateFn - Function to generate filename (called with feedback)
 * @param {Object} context - Context for validation
 * @param {Object} options - Options including retry settings
 * @returns {Promise<Object>} Final result with validation metadata
 */
export async function generateFilenameWithValidation(generateFn, context, options = {}) {
  const settings = getValidationSettings();
  const loopStartTime = Date.now();

  if (!settings.enabled) {
    logger.info(`[AUTO-VALIDATION] Validation disabled in settings, skipping validation loop`);
    const result = await generateFn(null);
    return {
      ...result,
      validationSkipped: true,
    };
  }

  const maxRetries = options.maxRetries || settings.maxRetries;
  const failures = [];
  const attemptHistory = []; // Track all attempts for summary
  let lastResult = null;
  let lastValidation = null;

  logger.info(`[AUTO-VALIDATION] ╔═════════════════════════════════════════════════════════════════╗`);
  logger.info(`[AUTO-VALIDATION] ║         STARTING VALIDATION WORKFLOW                           ║`);
  logger.info(`[AUTO-VALIDATION] ╠═════════════════════════════════════════════════════════════════╣`);
  logger.info(`[AUTO-VALIDATION] ║ File: ${context.originalFilename.substring(0, 50).padEnd(50)} ║`);
  logger.info(`[AUTO-VALIDATION] ║ Category: ${(context.category || 'unknown').padEnd(47)} ║`);
  logger.info(`[AUTO-VALIDATION] ║ Max Attempts: ${String(maxRetries).padEnd(44)} ║`);
  logger.info(`[AUTO-VALIDATION] ╚═════════════════════════════════════════════════════════════════╝`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const attemptStartTime = Date.now();

    // Generate filename (with feedback from previous failures)
    const feedback = failures.length > 0
      ? `Previous attempt failed validation: ${failures[failures.length - 1].reason}. ${failures[failures.length - 1].suggestedFix || ''}`
      : null;

    logger.info(`[AUTO-VALIDATION]`);
    logger.info(`[AUTO-VALIDATION] ══════════════════════════════════════════════════════════════════`);
    logger.info(`[AUTO-VALIDATION]  ATTEMPT ${attempt} OF ${maxRetries}`);
    logger.info(`[AUTO-VALIDATION] ══════════════════════════════════════════════════════════════════`);

    if (feedback) {
      logger.info(`[AUTO-VALIDATION] Feedback from previous failure:`);
      logger.info(`[AUTO-VALIDATION]   "${feedback}"`);
    }

    logger.info(`[AUTO-VALIDATION] Step 1: Generating filename...`);
    const generateResult = await generateFn(feedback);
    lastResult = generateResult;

    if (!generateResult.filename) {
      logger.error(`[AUTO-VALIDATION] ✗ Generation returned no filename`);
      const failureRecord = {
        attempt,
        filename: null,
        reason: 'Generation returned no filename',
        suggestedFix: 'Try with different prompt approach',
        timeMs: Date.now() - attemptStartTime,
      };
      failures.push(failureRecord);
      attemptHistory.push(failureRecord);
      continue;
    }

    logger.info(`[AUTO-VALIDATION] ✓ Generated: "${generateResult.filename}"`);
    logger.info(`[AUTO-VALIDATION] Step 2: Validating filename...`);

    // Validate the generated filename
    const validation = await validateFilenameWithAI({
      originalFilename: context.originalFilename,
      generatedFilename: generateResult.filename,
      fileContent: context.fileContent,
      category: context.category,
      appliedPrompt: generateResult.prompt,
      imageBase64: context.imageBase64,
      previousFailures: failures,
    });
    lastValidation = validation;

    const attemptRecord = {
      attempt,
      filename: generateResult.filename,
      valid: validation.valid,
      reason: validation.reason,
      suggestedFix: validation.suggestedFix,
      checks: validation.checks,
      timeMs: Date.now() - attemptStartTime,
      prompt: validation.prompt,
      response: validation.response,
      model: validation.model,
    };
    attemptHistory.push(attemptRecord);

    if (validation.valid) {
      // ═══════════════════════════════════════════════════════════════════════
      // WORKFLOW COMPLETE - SUCCESS
      // ═══════════════════════════════════════════════════════════════════════
      const totalTime = Date.now() - loopStartTime;
      logger.info(`[AUTO-VALIDATION]`);
      logger.info(`[AUTO-VALIDATION] ╔═════════════════════════════════════════════════════════════════╗`);
      logger.info(`[AUTO-VALIDATION] ║                    ✓ VALIDATION PASSED                         ║`);
      logger.info(`[AUTO-VALIDATION] ╠═════════════════════════════════════════════════════════════════╣`);
      logger.info(`[AUTO-VALIDATION] ║ Final Filename: ${generateResult.filename.substring(0, 43).padEnd(43)} ║`);
      logger.info(`[AUTO-VALIDATION] ║ Passed on Attempt: ${String(attempt).padEnd(40)} ║`);
      logger.info(`[AUTO-VALIDATION] ║ Reason: ${validation.reason.substring(0, 51).padEnd(51)} ║`);
      logger.info(`[AUTO-VALIDATION] ║ Total Time: ${(totalTime + 'ms').padEnd(47)} ║`);
      logger.info(`[AUTO-VALIDATION] ╚═════════════════════════════════════════════════════════════════╝`);

      // Log attempt history summary
      logger.info(`[AUTO-VALIDATION]`);
      logger.info(`[AUTO-VALIDATION] ─── ATTEMPT HISTORY ───────────────────────────────────────────────`);
      attemptHistory.forEach((h, i) => {
        logger.info(`[AUTO-VALIDATION] ${i + 1}. ${h.valid ? '✓' : '✗'} "${h.filename || 'no filename'}" - ${h.reason.substring(0, 40)}`);
      });
      logger.info(`[AUTO-VALIDATION] ───────────────────────────────────────────────────────────────────`);

      return {
        ...generateResult,
        validationPassed: true,
        validationAttempts: attempt,
        validationReason: validation.reason,
        validationTimeMs: validation.timeMs,
        validationHistory: attemptHistory,
      };
    }

    // Validation failed - record and potentially retry
    logger.warn(`[AUTO-VALIDATION] ✗ Validation FAILED: ${validation.reason}`);
    if (validation.suggestedFix) {
      logger.info(`[AUTO-VALIDATION]   Suggestion: ${validation.suggestedFix}`);
    }

    failures.push({
      reason: validation.reason,
      suggestedFix: validation.suggestedFix,
      checks: validation.checks,
      attempt,
    });

    if (attempt < maxRetries) {
      logger.info(`[AUTO-VALIDATION]   → Retrying with feedback...`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW COMPLETE - FAILED
  // ═══════════════════════════════════════════════════════════════════════════
  const totalTime = Date.now() - loopStartTime;
  logger.warn(`[AUTO-VALIDATION]`);
  logger.warn(`[AUTO-VALIDATION] ╔═════════════════════════════════════════════════════════════════╗`);
  logger.warn(`[AUTO-VALIDATION] ║                    ✗ VALIDATION FAILED                         ║`);
  logger.warn(`[AUTO-VALIDATION] ╠═════════════════════════════════════════════════════════════════╣`);
  logger.warn(`[AUTO-VALIDATION] ║ Final Filename: ${(lastResult?.filename || 'none').substring(0, 43).padEnd(43)} ║`);
  logger.warn(`[AUTO-VALIDATION] ║ Failed after: ${(maxRetries + ' attempts').padEnd(45)} ║`);
  logger.warn(`[AUTO-VALIDATION] ║ Last Reason: ${(lastValidation?.reason || 'unknown').substring(0, 46).padEnd(46)} ║`);
  logger.warn(`[AUTO-VALIDATION] ║ Total Time: ${(totalTime + 'ms').padEnd(47)} ║`);
  logger.warn(`[AUTO-VALIDATION] ╚═════════════════════════════════════════════════════════════════╝`);

  // Log attempt history summary
  logger.warn(`[AUTO-VALIDATION]`);
  logger.warn(`[AUTO-VALIDATION] ─── ATTEMPT HISTORY ───────────────────────────────────────────────`);
  attemptHistory.forEach((h, i) => {
    logger.warn(`[AUTO-VALIDATION] ${i + 1}. ✗ "${h.filename || 'no filename'}" - ${h.reason.substring(0, 40)}`);
    if (h.suggestedFix) {
      logger.warn(`[AUTO-VALIDATION]       Suggestion: ${h.suggestedFix.substring(0, 50)}`);
    }
  });
  logger.warn(`[AUTO-VALIDATION] ───────────────────────────────────────────────────────────────────`);

  return {
    ...lastResult,
    validationPassed: false,
    validationFailed: true,
    validationAttempts: maxRetries,
    validationReason: lastValidation?.reason || 'Validation failed after all attempts',
    validationFailures: failures,
    validationHistory: attemptHistory,
  };
}

export default {
  validateFilenameWithAI,
  generateFilenameWithValidation,
  getValidationSettings,
};
