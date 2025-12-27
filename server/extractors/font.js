import opentype from 'opentype.js';
import { readBinaryFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractFont(filePath, options = {}) {
  logger.debug(`Extracting font from: ${filePath}`);

  try {
    const buffer = await readBinaryFile(filePath);
    const font = opentype.parse(buffer.buffer);

    const metadata = {
      familyName: font.names.fontFamily?.en || null,
      subfamilyName: font.names.fontSubfamily?.en || null,
      fullName: font.names.fullName?.en || null,
      postScriptName: font.names.postScriptName?.en || null,
      version: font.names.version?.en || null,
      copyright: font.names.copyright?.en || null,
      designer: font.names.designer?.en || null,
      manufacturer: font.names.manufacturer?.en || null,
      license: font.names.license?.en || null,
      glyphCount: font.glyphs.length,
      unitsPerEm: font.unitsPerEm,
    };

    const content = buildFontDescription(metadata);

    return {
      content,
      metadata,
    };
  } catch (error) {
    logger.error(`Font extraction failed: ${error.message}`);
    return {
      content: `Font file: ${filePath}`,
      metadata: {
        error: error.message,
      },
    };
  }
}

function buildFontDescription(metadata) {
  const parts = [];

  if (metadata.familyName) parts.push(`Family: ${metadata.familyName}`);
  if (metadata.subfamilyName) parts.push(`Style: ${metadata.subfamilyName}`);
  if (metadata.fullName) parts.push(`Full Name: ${metadata.fullName}`);
  if (metadata.designer) parts.push(`Designer: ${metadata.designer}`);
  if (metadata.version) parts.push(`Version: ${metadata.version}`);
  if (metadata.glyphCount) parts.push(`Glyphs: ${metadata.glyphCount}`);

  return parts.join('\n') || 'Font file';
}

export default extractFont;
