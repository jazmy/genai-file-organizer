import mammoth from 'mammoth';
import { readBinaryFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractDocx(filePath, options = {}) {
  const { maxLength = 25000 } = options;

  logger.debug(`Extracting DOCX from: ${filePath}`);

  try {
    const buffer = await readBinaryFile(filePath);
    const result = await mammoth.extractRawText({ buffer });

    let content = result.value || '';

    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
    }

    return {
      content,
      metadata: {
        length: content.length,
        messages: result.messages,
      },
    };
  } catch (error) {
    logger.error(`DOCX extraction failed: ${error.message}`);
    throw error;
  }
}

export default extractDocx;
