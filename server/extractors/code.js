import { readTextFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractCode(filePath, options = {}) {
  const { maxLength = 25000 } = options;

  logger.debug(`Extracting code from: ${filePath}`);

  try {
    let content = await readTextFile(filePath);

    if (content.length > maxLength) {
      content = content.substring(0, maxLength);
    }

    const analysis = analyzeCode(content, filePath);

    return {
      content,
      metadata: {
        ...analysis,
        length: content.length,
        lines: content.split('\n').length,
      },
    };
  } catch (error) {
    logger.error(`Code extraction failed: ${error.message}`);
    throw error;
  }
}

function analyzeCode(content, filePath) {
  const analysis = {
    language: detectLanguage(filePath),
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    comments: 0,
  };

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      analysis.comments++;
    }

    const funcMatch = trimmed.match(/^(?:async\s+)?(?:function|def|fn)\s+(\w+)/);
    if (funcMatch) {
      analysis.functions.push(funcMatch[1]);
    }

    const arrowMatch = trimmed.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (arrowMatch) {
      analysis.functions.push(arrowMatch[1]);
    }

    const classMatch = trimmed.match(/^class\s+(\w+)/);
    if (classMatch) {
      analysis.classes.push(classMatch[1]);
    }

    const importMatch = trimmed.match(/^(?:import|from|require)/);
    if (importMatch) {
      analysis.imports.push(trimmed.substring(0, 100));
    }

    const exportMatch = trimmed.match(/^export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/);
    if (exportMatch) {
      analysis.exports.push(exportMatch[1]);
    }
  }

  analysis.functions = analysis.functions.slice(0, 20);
  analysis.classes = analysis.classes.slice(0, 10);
  analysis.imports = analysis.imports.slice(0, 10);
  analysis.exports = analysis.exports.slice(0, 10);

  return analysis;
}

function detectLanguage(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const langMap = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript-react',
    tsx: 'typescript-react',
    json: 'json',
    css: 'css',
    html: 'html',
    xml: 'xml',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
  };

  return langMap[ext] || ext;
}

export default extractCode;
