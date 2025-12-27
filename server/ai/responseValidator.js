import logger from '../utils/logger.js';

/**
 * AI Response Validator
 * Validates and sanitizes AI responses to ensure they meet expected formats
 */

// Valid category patterns - should match database prompts
const VALID_CATEGORIES = new Set([
  'prd', 'meeting_notes', 'strategy', 'report', 'plan', 'proposal',
  'guide', 'memo', 'research', 'transcript', 'template', 'feedback',
  'announcement', 'training', 'newsletter', 'draft', 'note', 'prompt',
  'job_posting', 'mail', 'invoice', 'infographic', 'screenshot',
  'photo', 'sticker', 'code', 'audio', 'video', 'meme', 'design',
  'form', 'data', 'invitation', 'essay', 'document', 'receipt',
]);

// Image file extensions - these should NEVER be categorized as 'note'
const IMAGE_EXTENSIONS = new Set([
  'avif', 'webp', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif',
  'heic', 'heif', 'svg', 'ico', 'raw', 'cr2', 'nef', 'arw',
]);

// Valid image categories
const IMAGE_CATEGORIES = new Set([
  'photo', 'screenshot', 'infographic', 'meme', 'sticker', 'design',
  'mail', 'invoice', // these can also be images
]);

// Filename keywords that indicate specific categories (case-insensitive)
// PRIORITY ORDER: Keywords earlier in this object take precedence
const FILENAME_CATEGORY_KEYWORDS = {
  // Forms - highest priority (form numbers first)
  'ds11': 'form',
  'ds-11': 'form',
  'ds82': 'form',
  'ds-82': 'form',
  'w9': 'form',
  'w-9': 'form',
  'w4': 'form',
  'w-4': 'form',
  'i9': 'form',
  'i-9': 'form',
  '1040': 'form',
  '1099': 'form',
  'w2': 'form',
  'w-2': 'form',
  'form': 'form',
  'application': 'form',
  // Reports - should take precedence over research
  'report': 'report',
  // Infographics and diagrams - should take precedence over photo
  'infographic': 'infographic',
  'diagram': 'infographic',
  'chart': 'infographic',
  'graph': 'infographic',
  'flowchart': 'infographic',
  // Invoice and receipts - important for image categorization
  // NOTE: "bill" removed - too ambiguous (Bill of Rights, Bill Gates, etc.)
  'invoice': 'invoice',
  'receipt': 'invoice',
  'order': 'invoice',
  'purchase': 'invoice',
  'payment': 'invoice',
  'meeting': 'meeting_notes',
  'agenda': 'meeting_notes',
  'minutes': 'meeting_notes',
  'prd': 'prd',
  'requirements': 'prd',
  'spec': 'prd',
  'guide': 'guide',
  'manual': 'guide',
  'howto': 'guide',
  'tutorial': 'guide',
  'proposal': 'proposal',
  'strategy': 'strategy',
  'plan': 'plan',
  'roadmap': 'plan',
  'timeline': 'plan',
  'transcript': 'transcript',
  'memo': 'memo',
  'research': 'research',
  'study': 'research',
  'whitepaper': 'research',
  'template': 'template',
  'feedback': 'feedback',
  'review': 'feedback',
  'announcement': 'announcement',
  'training': 'training',
  'newsletter': 'newsletter',
  'draft': 'draft',
  'prompt': 'prompt',
  'invitation': 'invitation',
  'invite': 'invitation',
  // Screenshots
  'screenshot': 'screenshot',
  'screen': 'screenshot',
  'capture': 'screenshot',
  // Design
  'mockup': 'design',
  'wireframe': 'design',
  'design': 'design',
  'logo': 'design',
};

// Filename validation patterns
const FILENAME_PATTERNS = {
  // Standard formats: prefix_description_date.ext
  standard: /^[a-z]+_[a-z0-9][a-z0-9_\-]*\.[a-z0-9]{1,10}$/i,
  // Looser format allowing more characters
  loose: /^[a-zA-Z][a-zA-Z0-9_\-\.]*\.[a-zA-Z0-9]{1,10}$/,
  // Very loose - just needs extension
  minimal: /^[^\s\/\\:*?"<>|]+\.[a-zA-Z0-9]{1,10}$/,
};

// Dangerous characters that should be removed
const DANGEROUS_CHARS = /[\/\\:*?"<>|\x00-\x1f\x7f]/g;

// Maximum filename length (without extension)
const MAX_FILENAME_LENGTH = 200;

// Valid filename prefixes - these MUST be used to start filenames
// Corresponds to category names that are valid as prefixes
// Also includes abbreviated forms that prompts may specify (e.g., meeting_ for meeting_notes)
const VALID_PREFIXES = new Set([
  'note', 'report', 'photo', 'img', 'invoice', 'receipt', 'screenshot', 'infographic',
  'meme', 'sticker', 'design', 'mail', 'form', 'data', 'code', 'audio', 'video',
  'prd', 'meeting_notes', 'meeting', 'strategy', 'plan', 'proposal', 'guide', 'memo',
  'research', 'transcript', 'template', 'feedback', 'announcement', 'training',
  'newsletter', 'draft', 'prompt', 'job_posting', 'invitation', 'essay', 'document',
  // Abbreviated forms from prompts
  'inv', 'ss', 'vid', 'aud',
]);

// Reserved Windows filenames
const RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

export class ResponseValidator {
  constructor() {
    this.validationFailures = [];
    this.maxFailureLog = 100;
  }

  /**
   * Log a validation failure for analysis
   */
  logFailure(type, input, reason, context = {}) {
    const failure = {
      type,
      input: typeof input === 'string' ? input.substring(0, 500) : input,
      reason,
      context,
      timestamp: new Date().toISOString(),
    };

    this.validationFailures.push(failure);

    // Keep only recent failures
    if (this.validationFailures.length > this.maxFailureLog) {
      this.validationFailures.shift();
    }

    logger.warn(`[ResponseValidator] ${type} validation failed: ${reason}`, {
      input: typeof input === 'string' ? input.substring(0, 100) : input,
      ...context,
    });
  }

  /**
   * Get recent validation failures for debugging
   */
  getRecentFailures(limit = 20) {
    return this.validationFailures.slice(-limit);
  }

  /**
   * Check if a filename has an image extension
   */
  isImageFile(fileName) {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext && IMAGE_EXTENSIONS.has(ext);
  }

  /**
   * Detect category from filename keywords
   */
  detectCategoryFromFilename(fileName) {
    if (!fileName) return null;
    const lowerName = fileName.toLowerCase();

    for (const [keyword, category] of Object.entries(FILENAME_CATEGORY_KEYWORDS)) {
      // Check if keyword appears as a word boundary (not just substring)
      const regex = new RegExp(`(^|[^a-z])${keyword}([^a-z]|$)`, 'i');
      if (regex.test(lowerName)) {
        logger.info(`[ResponseValidator] Detected category "${category}" from filename keyword "${keyword}" in "${fileName}"`);
        return category;
      }
    }
    return null;
  }

  /**
   * Validate and normalize a category response
   */
  validateCategory(response, context = {}) {
    const { fileName } = context;
    const isImage = this.isImageFile(fileName);
    const filenameCategory = this.detectCategoryFromFilename(fileName);

    if (!response || typeof response !== 'string') {
      this.logFailure('category', response, 'Empty or invalid response', context);
      // Use filename-detected category, or default based on file type
      if (filenameCategory) {
        return { valid: true, category: filenameCategory, fallback: false, detectedFromFilename: true };
      }
      const defaultCategory = isImage ? 'photo' : 'note';
      return { valid: false, category: defaultCategory, fallback: true };
    }

    // Clean up the response
    let cleaned = response.toLowerCase().trim();

    // CRITICAL: Check if AI just echoed back the filename instead of a category
    // This happens when the model misunderstands the task
    if (fileName) {
      const normalizedResponse = cleaned.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const normalizedFilename = fileName.replace(/[^a-z0-9]/gi, '').toLowerCase();

      // If the response looks like the filename (with or without extension), it's invalid
      if (normalizedResponse === normalizedFilename ||
          normalizedFilename.startsWith(normalizedResponse) ||
          normalizedResponse.startsWith(normalizedFilename.replace(/\.[a-z0-9]+$/i, ''))) {
        logger.warn(`[ResponseValidator] AI echoed filename "${response}" instead of category for "${fileName}"`);
        this.logFailure('category', response, 'AI returned filename instead of category', context);

        // Use filename-detected category or fallback
        if (filenameCategory) {
          return { valid: true, category: filenameCategory, fallback: false, detectedFromFilename: true, echoedFilename: true };
        }
        const defaultCategory = isImage ? 'photo' : 'note';
        return { valid: false, category: defaultCategory, fallback: true, echoedFilename: true };
      }
    }

    // Remove common prefixes/suffixes from model responses
    cleaned = cleaned.replace(/^(category|type|result|answer)[\s:]+/i, '');
    cleaned = cleaned.replace(/['"`.]+/g, '');
    cleaned = cleaned.replace(/\s+/g, '_');

    // Extract just letters and underscores
    const normalized = cleaned.replace(/[^a-z_]/g, '');

    // Determine the category
    let category = null;
    let matched = false;
    let synonym = false;

    // Direct match
    if (VALID_CATEGORIES.has(normalized)) {
      category = normalized;
    }

    // Try partial matching
    if (!category) {
      for (const validCat of VALID_CATEGORIES) {
        if (normalized.includes(validCat) || validCat.includes(normalized)) {
          category = validCat;
          matched = true;
          break;
        }
      }
    }

    // Common synonyms
    if (!category) {
      const synonyms = {
        receipt: 'invoice',
        order: 'invoice',
        bill: 'invoice',
        purchase: 'invoice',
        photo: 'photo',
        picture: 'photo',
        image: 'photo',
        notes: 'note',
        document: 'note',
        meeting: 'meeting_notes',
        screen: 'screenshot',
        capture: 'screenshot',
      };

      for (const [syn, cat] of Object.entries(synonyms)) {
        if (normalized.includes(syn)) {
          category = cat;
          synonym = true;
          break;
        }
      }
    }

    // NOTE: We now trust the AI's category decision over filename keywords
    // The AI reads the content and can distinguish between e.g. "meeting_report.pdf" being a report vs meeting_notes
    // Only log a note if there's a mismatch, but DON'T override
    if (filenameCategory && filenameCategory !== category && category) {
      logger.info(`[ResponseValidator] AI chose "${category}" despite filename suggesting "${filenameCategory}" - trusting AI (reads content)`);
    }

    // Only use filename category as FALLBACK when AI didn't return a valid category
    if (!category && filenameCategory) {
      logger.info(`[ResponseValidator] Using filename-detected category "${filenameCategory}" as fallback`);
      return {
        valid: true,
        category: filenameCategory,
        fallback: true,
        detectedFromFilename: true,
        reason: 'Filename keyword used as fallback (AI did not return valid category)'
      };
    }

    // CRITICAL: Prevent false positive invoice categorization
    // "Bill of Rights" is NOT an invoice - it's a historical/legal document
    if (category === 'invoice' && fileName) {
      const lowerName = fileName.toLowerCase();
      // Check for known false positives - documents that contain "bill" but aren't financial
      const invoiceFalsePositives = [
        /bill.?of.?rights/i,      // Bill of Rights
        /bill.?gates/i,           // Bill Gates
        /bill.?clinton/i,         // Bill Clinton
        /buffalo.?bill/i,         // Buffalo Bill
        /bill.?(nye|murray|cosby)/i, // Famous Bills
        /legislative.?bill/i,     // Legislative bills
        /congressional.?bill/i,   // Congressional bills
      ];

      for (const pattern of invoiceFalsePositives) {
        if (pattern.test(lowerName)) {
          logger.warn(`[ResponseValidator] Invoice false positive detected: "${fileName}" contains "${pattern}", overriding to "note"`);
          return {
            valid: true,
            category: 'note',
            fallback: false,
            overridden: true,
            originalCategory: category,
            reason: 'Document contains "bill" but is not a financial invoice'
          };
        }
      }
    }

    // CRITICAL: Enforce image categories for image files
    // If file is an image but categorized as 'note', override to 'photo'
    if (isImage && (category === 'note' || !category)) {
      logger.warn(`[ResponseValidator] Image file "${fileName}" was categorized as "${category || 'unknown'}", overriding to "photo"`);
      return {
        valid: true,
        category: 'photo',
        fallback: false,
        overridden: true,
        originalCategory: category,
        reason: 'Image files cannot be categorized as note'
      };
    }

    // Return the found category
    if (category) {
      return { valid: true, category, fallback: false, matched, synonym };
    }

    // Fallback - use filename category, 'photo' for images, or 'note' for others
    this.logFailure('category', response, `Unknown category: ${normalized}`, context);
    if (filenameCategory) {
      return { valid: true, category: filenameCategory, fallback: false, detectedFromFilename: true };
    }
    const fallbackCategory = isImage ? 'photo' : 'note';
    return { valid: false, category: fallbackCategory, fallback: true, original: normalized };
  }

  /**
   * Validate and sanitize a filename response
   */
  validateFilename(response, originalFilename, context = {}) {
    if (!response || typeof response !== 'string') {
      this.logFailure('filename', response, 'Empty or invalid response', context);
      return { valid: false, filename: null, fallback: true };
    }

    // Clean up the response
    let cleaned = response.trim();

    // Extract content from markdown code blocks
    const codeBlockMatch = cleaned.match(/```(?:\w*\n)?([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    // Remove inline code backticks
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

    // Remove common prefixes
    cleaned = cleaned.replace(/^(filename|name|result|output|renamed?|suggested)[\s:]+/i, '');
    cleaned = cleaned.replace(/["']/g, '');

    // If multi-line, try to find the best line
    if (cleaned.includes('\n')) {
      const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);

      // Look for a line that looks like a filename
      for (const line of lines) {
        if (this.looksLikeFilename(line)) {
          cleaned = line;
          break;
        }
      }

      // If still multi-line, take the last non-empty line
      if (cleaned.includes('\n')) {
        cleaned = lines[lines.length - 1] || cleaned;
      }
    }

    // Remove any remaining whitespace
    cleaned = cleaned.trim();

    // Validate the filename
    const validation = this.sanitizeFilename(cleaned, originalFilename);

    if (!validation.valid) {
      this.logFailure('filename', response, validation.reason, {
        ...context,
        cleaned,
        originalFilename,
      });
    }

    return validation;
  }

  /**
   * Check if a string looks like a filename
   */
  looksLikeFilename(str) {
    if (!str || str.length < 3) return false;

    // Must have an extension
    if (!str.includes('.')) return false;

    // Should not be too long
    if (str.length > MAX_FILENAME_LENGTH + 20) return false;

    // Should not contain spaces at the start/end
    if (str !== str.trim()) return false;

    // Try matching patterns
    return (
      FILENAME_PATTERNS.standard.test(str) ||
      FILENAME_PATTERNS.loose.test(str) ||
      FILENAME_PATTERNS.minimal.test(str)
    );
  }

  /**
   * Sanitize a filename to make it safe
   * IMPORTANT: Always uses the original file's extension, never the LLM output
   */
  sanitizeFilename(filename, originalFilename) {
    if (!filename) {
      return { valid: false, filename: null, reason: 'Empty filename' };
    }

    // Check if AI just returned the original filename unchanged (failure case)
    const normalizedInput = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedOriginal = originalFilename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedInput === normalizedOriginal) {
      logger.warn(`[ResponseValidator] AI returned original filename unchanged: "${filename}"`);
      return {
        valid: false,
        filename: null,
        reason: 'AI returned the original filename unchanged - needs descriptive rename',
        unchangedFilename: true,
      };
    }

    // Get original extension - this is the ONLY extension we'll use
    const originalExt = this.getExtension(originalFilename);

    // Remove dangerous characters
    let safe = filename.replace(DANGEROUS_CHARS, '');

    // Replace multiple spaces/underscores with single underscore
    safe = safe.replace(/[\s_]+/g, '_');

    // Remove leading/trailing dots, spaces, underscores
    safe = safe.replace(/^[\s._]+|[\s._]+$/g, '');

    // Split name and extension from AI output
    const parts = safe.split('.');
    // Discard any extension from the AI - we'll use the original
    if (parts.length > 1) {
      parts.pop(); // Remove the AI's extension
    }
    let name = parts.join('.');

    // ALWAYS use the original file's extension
    // Never trust the LLM to provide the correct extension
    const ext = originalExt || 'txt';

    logger.info(`[ResponseValidator] Extension enforcement: original="${originalExt}", using="${ext}" for ${originalFilename}`);

    // Check reserved names
    if (RESERVED_NAMES.has(name.toLowerCase())) {
      name = `file_${name}`;
    }

    // Truncate if too long
    if (name.length > MAX_FILENAME_LENGTH) {
      name = name.substring(0, MAX_FILENAME_LENGTH);
    }

    // Ensure we have a valid name
    if (!name || name.length < 1) {
      return { valid: false, filename: null, reason: 'Empty filename after sanitization' };
    }

    const sanitized = `${name}.${ext}`;

    // Final validation
    if (!this.looksLikeFilename(sanitized)) {
      return {
        valid: false,
        filename: sanitized,
        reason: 'Sanitized filename does not match expected pattern',
      };
    }

    // CRITICAL: Check that filename has a valid category prefix
    // Filenames MUST start with a prefix like "note_", "report_", "photo_", etc.
    // If the AI returned the original filename unchanged (e.g., "Bill_of_Rights_6-8.doc"),
    // it won't have a prefix and should be rejected so the fallback generator creates a proper filename
    const prefixCheck = this.hasValidPrefix(sanitized);
    if (!prefixCheck.hasPrefix) {
      logger.warn(`[ResponseValidator] Filename "${sanitized}" is missing a valid category prefix, marking as invalid`);
      return {
        valid: false,
        filename: sanitized,
        reason: 'Filename must start with a valid category prefix (e.g., note_, report_, photo_)',
        missingPrefix: true,
      };
    }

    return {
      valid: true,
      filename: sanitized,
      modified: sanitized !== filename,
      original: filename,
      prefix: prefixCheck.prefix,
    };
  }

  /**
   * Get file extension from filename
   */
  getExtension(filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Check if filename starts with a valid category prefix
   * Returns { hasPrefix: boolean, prefix: string|null }
   */
  hasValidPrefix(filename) {
    if (!filename) return { hasPrefix: false, prefix: null };

    const lowerName = filename.toLowerCase();

    // Check each valid prefix
    for (const prefix of VALID_PREFIXES) {
      // Prefix must be followed by underscore (e.g., "note_", "report_")
      if (lowerName.startsWith(`${prefix}_`)) {
        return { hasPrefix: true, prefix };
      }
    }

    return { hasPrefix: false, prefix: null };
  }

  /**
   * Extract date from filename if present
   */
  extractDateFromFilename(filename) {
    // Try various date patterns
    // YYYY-MM-DD
    let match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    // YYYYMMDD
    match = filename.match(/(\d{8})/);
    if (match) {
      const d = match[1];
      return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
    }

    // Month_Year or Month-Year (e.g., MAY_2024, November-2025)
    const monthNames = {
      'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
      'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
      'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
      'august': '08', 'aug': '08', 'september': '09', 'sep': '09',
      'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
      'december': '12', 'dec': '12'
    };
    match = filename.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[-_\s]?(20\d{2}|19\d{2})/i);
    if (match) {
      const month = monthNames[match[1].toLowerCase()];
      const year = match[2];
      return `${year}-${month}`;
    }

    // Just year (e.g., 2024)
    match = filename.match(/(^|[^0-9])(20\d{2}|19\d{2})([^0-9]|$)/);
    if (match) {
      return match[2];
    }

    return null;
  }

  /**
   * Get the prefix for a category (e.g., 'photo' -> 'photo_')
   */
  getCategoryPrefix(category) {
    const prefix = VALID_CATEGORIES.has(category) ? category : 'file';
    return `${prefix}_`;
  }

  /**
   * Validate filename and fix common issues (missing prefix, etc.)
   * Returns { filename, wasFixed, fixType } - always returns a usable filename
   */
  validateAndFixFilename(aiResponse, originalFilename, category, context = {}) {
    const validation = this.validateFilename(aiResponse, originalFilename, {
      ...context,
      category,
      step: 'naming',
    });

    // Valid filename - use as-is
    if (validation.valid && validation.filename) {
      return {
        filename: validation.filename,
        wasFixed: validation.modified,
        fixType: validation.modified ? 'sanitized' : null,
        validation,
      };
    }

    // Filename is good but just missing prefix - prepend it
    if (validation.missingPrefix && validation.filename) {
      const prefix = this.getCategoryPrefix(category);
      const fixedFilename = `${prefix}${validation.filename}`;
      logger.info(`[ResponseValidator] Prepended prefix to descriptive filename: ${fixedFilename}`);
      return {
        filename: fixedFilename,
        wasFixed: true,
        fixType: 'prefix_prepended',
        validation,
      };
    }

    // Invalid filename - generate fallback
    const fallback = this.generateFallback(category, originalFilename, {
      reason: validation.reason,
      response: aiResponse,
    });
    return {
      filename: fallback,
      wasFixed: true,
      fixType: 'fallback',
      validation,
    };
  }

  /**
   * Generate a fallback filename when AI fails
   */
  generateFallback(category, originalFilename, context = {}) {
    const ext = this.getExtension(originalFilename) || 'txt';

    // Try to extract date from original filename - NEVER use today's date
    const extractedDate = this.extractDateFromFilename(originalFilename);

    // Use category as prefix
    const prefix = VALID_CATEGORIES.has(category) ? category : 'file';

    // Try to extract meaningful info from original filename
    const originalName = originalFilename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9]+/g, '-') // Replace non-alphanumeric
      .substring(0, 30);

    // Only include date if one was found in the original filename
    const fallback = extractedDate
      ? `${prefix}_${originalName}_${extractedDate}.${ext}`
      : `${prefix}_${originalName}.${ext}`;

    logger.info(`[ResponseValidator] Generated fallback filename: ${fallback} (extracted date: ${extractedDate || 'none'})`);

    return fallback;
  }

  /**
   * Validate a complete AI response (both category and filename)
   */
  validateResponse(categoryResponse, filenameResponse, originalFilename, context = {}) {
    const categoryResult = this.validateCategory(categoryResponse, context);

    // Use the unified validation method
    const filenameResult = this.validateAndFixFilename(
      filenameResponse,
      originalFilename,
      categoryResult.category,
      context
    );

    return {
      category: categoryResult,
      filename: {
        ...filenameResult.validation,
        final: filenameResult.filename,
        fallbackUsed: filenameResult.fixType === 'fallback',
      },
      fullyValid: categoryResult.valid && !filenameResult.wasFixed,
    };
  }
}

// Export singleton
export const responseValidator = new ResponseValidator();
export default responseValidator;
