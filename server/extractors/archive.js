import { spawn } from 'child_process';
import logger from '../utils/logger.js';

export async function extractArchive(filePath, options = {}) {
  const { maxFiles = 100 } = options;

  logger.debug(`Extracting archive info from: ${filePath}`);

  try {
    const contents = await listArchiveContents(filePath);

    const limitedContents = contents.slice(0, maxFiles);
    const content = `Archive contents:\n${limitedContents.join('\n')}`;

    const analysis = analyzeArchiveContents(limitedContents);

    return {
      content,
      metadata: {
        fileCount: contents.length,
        ...analysis,
      },
    };
  } catch (error) {
    logger.error(`Archive extraction failed: ${error.message}`);
    return {
      content: `Archive file: ${filePath}`,
      metadata: {
        error: error.message,
      },
    };
  }
}

async function listArchiveContents(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();

  if (ext === 'zip') {
    return listZipContents(filePath);
  } else if (ext === 'tar' || ext === 'gz') {
    return listTarContents(filePath);
  } else if (ext === 'dmg') {
    return [`DMG disk image: ${filePath}`];
  } else if (ext === 'rar') {
    return listRarContents(filePath);
  } else if (ext === '7z') {
    return list7zContents(filePath);
  }

  return [`Archive: ${filePath}`];
}

function listZipContents(filePath) {
  return new Promise((resolve, reject) => {
    const unzip = spawn('unzip', ['-l', filePath]);
    let stdout = '';

    unzip.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    unzip.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`unzip failed with code ${code}`));
        return;
      }

      const lines = stdout.split('\n');
      const files = lines
        .slice(3, -3)
        .map((line) => {
          const parts = line.trim().split(/\s+/);
          return parts.slice(3).join(' ');
        })
        .filter((f) => f && !f.endsWith('/'));

      resolve(files);
    });

    unzip.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('unzip not found'));
      } else {
        reject(err);
      }
    });
  });
}

function listTarContents(filePath) {
  return new Promise((resolve, reject) => {
    const args = filePath.endsWith('.gz') ? ['-tzf', filePath] : ['-tf', filePath];
    const tar = spawn('tar', args);
    let stdout = '';

    tar.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    tar.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`tar failed with code ${code}`));
        return;
      }

      const files = stdout.split('\n').filter((f) => f && !f.endsWith('/'));
      resolve(files);
    });

    tar.on('error', reject);
  });
}

function listRarContents(filePath) {
  return new Promise((resolve, reject) => {
    const unrar = spawn('unrar', ['l', filePath]);
    let stdout = '';

    unrar.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    unrar.on('close', () => {
      const lines = stdout.split('\n');
      const files = lines
        .filter((line) => line.includes('..'))
        .map((line) => line.trim().split(/\s+/).pop())
        .filter(Boolean);

      resolve(files.length > 0 ? files : [`RAR archive: ${filePath}`]);
    });

    unrar.on('error', () => {
      resolve([`RAR archive: ${filePath}`]);
    });
  });
}

function list7zContents(filePath) {
  return new Promise((resolve, reject) => {
    const p7zip = spawn('7z', ['l', filePath]);
    let stdout = '';

    p7zip.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    p7zip.on('close', () => {
      const lines = stdout.split('\n');
      const files = lines
        .filter((line) => /^\d{4}-\d{2}-\d{2}/.test(line.trim()))
        .map((line) => line.trim().split(/\s+/).pop())
        .filter(Boolean);

      resolve(files.length > 0 ? files : [`7z archive: ${filePath}`]);
    });

    p7zip.on('error', () => {
      resolve([`7z archive: ${filePath}`]);
    });
  });
}

function analyzeArchiveContents(files) {
  const extensions = {};
  const directories = new Set();

  for (const file of files) {
    const parts = file.split('/');
    if (parts.length > 1) {
      directories.add(parts[0]);
    }

    const ext = file.split('.').pop().toLowerCase();
    if (ext && ext !== file) {
      extensions[ext] = (extensions[ext] || 0) + 1;
    }
  }

  return {
    topDirectories: Array.from(directories).slice(0, 10),
    fileTypes: extensions,
  };
}

export default extractArchive;
