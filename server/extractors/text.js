import { readTextFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractText(filePath, options = {}) {
  const { maxLength = 25000 } = options;

  logger.debug(`Extracting text from: ${filePath}`);

  try {
    let content = await readTextFile(filePath);

    if (filePath.endsWith('.html')) {
      content = stripHtml(content);
    }

    if (filePath.endsWith('.rtf')) {
      content = stripRtf(content);
    }

    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
    }

    return {
      content,
      metadata: {
        length: content.length,
        lines: content.split('\n').length,
      },
    };
  } catch (error) {
    logger.error(`Text extraction failed: ${error.message}`);
    throw error;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripRtf(rtf) {
  return rtf
    .replace(/\\[a-z]+\d*\s?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default extractText;
