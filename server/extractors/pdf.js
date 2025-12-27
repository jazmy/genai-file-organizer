import pdf from 'pdf-parse/lib/pdf-parse.js';
import { readBinaryFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

async function renderPdfToImage(filePath) {
  logger.info(`[PDF] Attempting to render PDF to image: ${filePath}`);
  
  try {
    const outputDir = tmpdir();
    const timestamp = Date.now();
    const outputFile = join(outputDir, `pdf_preview_${timestamp}`);
    
    // Use pdftoppm directly (from poppler)
    const cmd = `pdftoppm -jpeg -f 1 -l 1 -scale-to 512 "${filePath}" "${outputFile}"`;
    logger.info(`[PDF] Running: ${cmd}`);
    
    await execAsync(cmd, { timeout: 15000 });
    
    // pdftoppm adds -1 suffix for first page
    const outputPath = `${outputFile}-1.jpg`;
    logger.info(`[PDF] Checking for output: ${outputPath}`);
    
    if (existsSync(outputPath)) {
      const imageBuffer = readFileSync(outputPath);
      const base64 = imageBuffer.toString('base64');
      unlinkSync(outputPath); // Clean up
      logger.info(`[PDF] Rendered PDF first page to image (${base64.length} chars)`);
      return base64;
    }
    
    logger.warn(`[PDF] Output file not found`);
    return null;
  } catch (error) {
    logger.error(`[PDF] PDF to image conversion failed: ${error.message}`);
    return null;
  }
}

export async function extractPdf(filePath, options = {}) {
  const { maxLength = 25000, useVision = true } = options;

  logger.info(`[PDF] Extracting PDF from: ${filePath}`);

  try {
    logger.info(`[PDF] Reading file...`);
    const dataBuffer = await readBinaryFile(filePath);
    logger.info(`[PDF] Parsing PDF (${dataBuffer.length} bytes)...`);
    const data = await pdf(dataBuffer);
    logger.info(`[PDF] Parsed - ${data.numpages} pages, ${data.text?.length || 0} chars text`);

    let content = data.text || '';

    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
    }

    // Determine if we should use vision
    // Use vision if: little text content, or always for better classification
    const hasLittleText = content.trim().length < 500;
    logger.info(`[PDF] Has little text: ${hasLittleText} (${content.trim().length} chars)`);
    
    let imageBase64 = null;
    
    if (useVision && hasLittleText) {
      logger.info(`[PDF] Will attempt vision - rendering to image...`);
      imageBase64 = await renderPdfToImage(filePath);
      logger.info(`[PDF] Image result: ${imageBase64 ? 'success' : 'failed'}`);
    } else {
      logger.info(`[PDF] Skipping vision - enough text content`);
    }

    logger.info(`[PDF] Extraction complete`);
    return {
      content,
      metadata: {
        pages: data.numpages,
        info: data.info,
        length: content.length,
      },
      needsVision: hasLittleText && imageBase64 !== null,
      imageBase64,
    };
  } catch (error) {
    logger.error(`[PDF] PDF extraction failed: ${error.message}`);
    return {
      content: '',
      metadata: {},
      needsVision: true,
      error: error.message,
    };
  }
}

export default extractPdf;
