import { getFileExtension, getFileCategory } from '../utils/fileUtils.js';
import { extractText } from './text.js';
import { extractPdf } from './pdf.js';
import { extractDocx } from './docx.js';
import { extractDoc } from './doc.js';
import { extractSpreadsheet } from './spreadsheet.js';
import { extractImage } from './image.js';
import { extractAudio } from './audio.js';
import { extractVideo } from './video.js';
import { extractCode } from './code.js';
import { extractArchive } from './archive.js';
import { extractFont } from './font.js';
import { extractCalendar } from './calendar.js';
import { extractDesign } from './design.js';
import logger from '../utils/logger.js';

const extractorMap = {
  '.txt': extractText,
  '.md': extractText,
  '.rtf': extractText,
  '.html': extractText,

  '.pdf': extractPdf,

  '.docx': extractDocx,
  '.doc': extractDoc,

  '.xlsx': extractSpreadsheet,
  '.xls': extractSpreadsheet,
  '.csv': extractSpreadsheet,
  '.tsv': extractSpreadsheet,
  '.ods': extractSpreadsheet,

  '.py': extractCode,
  '.js': extractCode,
  '.ts': extractCode,
  '.jsx': extractCode,
  '.tsx': extractCode,
  '.json': extractCode,
  '.css': extractCode,
  '.xml': extractCode,

  '.png': extractImage,
  '.jpg': extractImage,
  '.jpeg': extractImage,
  '.gif': extractImage,
  '.bmp': extractImage,
  '.webp': extractImage,
  '.tiff': extractImage,
  '.heic': extractImage,
  '.avif': extractImage,
  '.svg': extractImage,
  '.ico': extractImage,
  '.icns': extractImage,

  '.psd': extractDesign,
  '.ai': extractDesign,
  '.xd': extractDesign,
  '.sketch': extractDesign,
  '.fig': extractDesign,

  '.ttf': extractFont,
  '.otf': extractFont,
  '.woff': extractFont,
  '.woff2': extractFont,

  '.mp3': extractAudio,
  '.wav': extractAudio,
  '.flac': extractAudio,
  '.m4a': extractAudio,
  '.aac': extractAudio,
  '.ogg': extractAudio,

  '.mp4': extractVideo,
  '.mov': extractVideo,
  '.avi': extractVideo,
  '.mkv': extractVideo,
  '.webm': extractVideo,
  '.m4v': extractVideo,

  '.zip': extractArchive,
  '.dmg': extractArchive,
  '.tar': extractArchive,
  '.gz': extractArchive,
  '.rar': extractArchive,
  '.7z': extractArchive,

  '.ics': extractCalendar,
  '.ical': extractCalendar,

  '.pptx': extractSpreadsheet,
  '.ppt': extractSpreadsheet,
};

export async function extractContent(filePath, options = {}) {
  const ext = getFileExtension(filePath);
  const category = getFileCategory(filePath);

  logger.debug(`Extracting content from ${filePath} (${ext}, ${category})`);

  const extractor = extractorMap[ext];

  if (!extractor) {
    logger.warn(`No extractor found for extension: ${ext}`);
    return {
      success: false,
      error: `Unsupported file type: ${ext}`,
      category,
      extension: ext,
    };
  }

  try {
    const result = await extractor(filePath, options);
    return {
      success: true,
      ...result,
      category,
      extension: ext,
    };
  } catch (error) {
    logger.error(`Extraction failed for ${filePath}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      category,
      extension: ext,
    };
  }
}

export function getSupportedExtensions() {
  return Object.keys(extractorMap);
}

export default {
  extractContent,
  getSupportedExtensions,
};
