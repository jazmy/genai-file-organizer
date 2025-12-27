import PSD from 'psd';
import { readBinaryFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractDesign(filePath, options = {}) {
  logger.debug(`Extracting design file from: ${filePath}`);

  const ext = filePath.split('.').pop().toLowerCase();

  try {
    if (ext === 'psd') {
      return await extractPsd(filePath, options);
    }

    return {
      content: `Design file: ${filePath}`,
      metadata: {
        type: ext,
        note: `${ext.toUpperCase()} files require specialized extraction`,
      },
      needsVision: true,
    };
  } catch (error) {
    logger.error(`Design extraction failed: ${error.message}`);
    return {
      content: `Design file: ${filePath}`,
      metadata: {
        error: error.message,
      },
      needsVision: true,
    };
  }
}

async function extractPsd(filePath, options = {}) {
  try {
    const psd = await PSD.open(filePath);
    const tree = psd.tree();

    const layers = [];
    function extractLayers(node, depth = 0) {
      if (node.name && node.name !== 'Root') {
        layers.push({
          name: node.name,
          depth,
          type: node.type,
          visible: node.visible,
        });
      }

      if (node.children) {
        for (const child of node.children()) {
          extractLayers(child, depth + 1);
        }
      }
    }

    extractLayers(tree);

    const metadata = {
      width: psd.header.width,
      height: psd.header.height,
      channels: psd.header.channels,
      depth: psd.header.depth,
      mode: psd.header.mode,
      layerCount: layers.length,
      layers: layers.slice(0, 30),
    };

    const content = `PSD File
Dimensions: ${metadata.width}x${metadata.height}
Layers (${layers.length}):
${layers.slice(0, 20).map((l) => `${'  '.repeat(l.depth)}${l.name}`).join('\n')}`;

    // pack() returns a stream, collect it into a buffer
    const png = psd.image.toPng();
    const stream = png.pack();
    const chunks = [];
    
    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
    const imageBuffer = Buffer.concat(chunks);
    const base64 = imageBuffer.toString('base64');

    return {
      content,
      metadata,
      imageBase64: base64,
      needsVision: true,
    };
  } catch (error) {
    logger.error(`PSD extraction failed: ${error.message}`);
    throw error;
  }
}

export default extractDesign;
