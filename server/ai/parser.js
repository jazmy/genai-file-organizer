import logger from '../utils/logger.js';

export function parseFilenameResponse(response) {
  if (!response || typeof response !== 'string') {
    logger.warn('Invalid AI response: empty or not a string');
    return null;
  }

  logger.info(`Raw AI response: ${response.substring(0, 500)}`);

  let cleaned = response
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^filename:\s*/i, '')
    .replace(/^here is.*?:\s*/i, '')
    .replace(/^the new filename.*?:\s*/i, '')
    .replace(/^suggested.*?:\s*/i, '')
    .replace(/^output:\s*/i, '')
    .replace(/```[a-z]*\n?/g, '')
    .trim();

  // Get first line that looks like a filename
  const lines = cleaned.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for a line that has an extension
    if (/\.[a-z0-9]+$/i.test(trimmed) && trimmed.length > 3) {
      cleaned = trimmed;
      break;
    }
  }
  
  // Remove any trailing explanation after the filename
  cleaned = cleaned.split(/\s{2,}/)[0].trim();

  if (!cleaned || cleaned.length < 3) {
    logger.warn(`Parsed filename too short: "${cleaned}"`);
    return null;
  }

  if (cleaned.length > 255) {
    logger.warn(`Filename too long, truncating: ${cleaned.length} chars`);
    const ext = cleaned.match(/\.[a-z0-9]+$/i)?.[0] || '';
    cleaned = cleaned.substring(0, 255 - ext.length) + ext;
  }

  const hasExtension = /\.[a-z0-9]+$/i.test(cleaned);
  if (!hasExtension) {
    logger.warn(`Filename missing extension: "${cleaned}"`);
  }

  return cleaned;
}

export function validateFilename(filename) {
  const errors = [];

  if (!filename) {
    errors.push('Filename is empty');
    return { valid: false, errors };
  }

  if (/[<>:"/\\|?*\x00-\x1f]/.test(filename)) {
    errors.push('Contains invalid characters');
  }

  if (filename.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }

  if (!/\.[a-z0-9]+$/i.test(filename)) {
    errors.push('Missing file extension');
  }

  if (/\s/.test(filename)) {
    errors.push('Contains spaces (should use underscores)');
  }

  if (filename !== filename.toLowerCase()) {
    errors.push('Contains uppercase characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function extractMetadataFromResponse(response) {
  const metadata = {
    category: null,
    primaryDescriptor: null,
    secondaryDetails: null,
    date: null,
    extension: null,
  };

  if (!response) return metadata;

  const extMatch = response.match(/\.([a-z0-9]+)$/i);
  if (extMatch) {
    metadata.extension = extMatch[1].toLowerCase();
  }

  const dateMatch = response.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    metadata.date = dateMatch[1];
  }

  const categoryMatch = response.match(/^([a-z]+)_/);
  if (categoryMatch) {
    metadata.category = categoryMatch[1];
  }

  const withoutExt = response.replace(/\.[a-z0-9]+$/i, '');
  const parts = withoutExt.split('_');

  if (parts.length >= 2) {
    metadata.primaryDescriptor = parts[1];
  }
  if (parts.length >= 3) {
    metadata.secondaryDetails = parts.slice(2).join('_').replace(/_\d{4}-\d{2}-\d{2}$/, '');
  }

  return metadata;
}

export default {
  parseFilenameResponse,
  validateFilename,
  extractMetadataFromResponse,
};
