import sharp from 'sharp';
import { readBinaryFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractImage(filePath, options = {}) {
  const { maxWidth = 1024, maxHeight = 1024 } = options;

  logger.debug(`Extracting image from: ${filePath}`);

  try {
    const buffer = await readBinaryFile(filePath);
    let image = sharp(buffer);

    const metadata = await image.metadata();

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      image = image.resize(maxWidth, maxHeight, { fit: 'inside' });
    }

    const processedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
    const base64 = processedBuffer.toString('base64');

    return {
      content: null,
      imageBase64: base64,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        size: buffer.length,
      },
      needsVision: true,
    };
  } catch (error) {
    logger.error(`Image extraction failed: ${error.message}`);
    throw error;
  }
}

export async function extractImageForVision(filePath, options = {}) {
  const result = await extractImage(filePath, options);
  return result.imageBase64;
}

export default extractImage;
