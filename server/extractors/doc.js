import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export async function extractDoc(filePath, options = {}) {
  const { maxLength = 25000 } = options;

  logger.debug(`Extracting DOC (binary) from: ${filePath}`);

  const tempDir = path.join(os.tmpdir(), `doc-extract-${crypto.randomBytes(8).toString('hex')}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    // Convert DOC to TXT using LibreOffice
    execSync(`soffice --headless --convert-to txt:Text --outdir "${tempDir}" "${filePath}"`, {
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Find the generated text file
    const baseName = path.basename(filePath, '.doc');
    const txtPath = path.join(tempDir, `${baseName}.txt`);

    let content = await fs.readFile(txtPath, 'utf-8');

    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
    }

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

    return {
      content,
      metadata: {
        length: content.length,
        convertedFrom: 'doc',
      },
    };
  } catch (error) {
    // Clean up on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    logger.error(`DOC extraction failed: ${error.message}`);
    throw error;
  }
}

export default extractDoc;
