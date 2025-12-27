import { describe, it, expect } from 'vitest';
import {
  isImageFile,
  formatFileSize,
  getFileExtension,
  sortFiles,
  groupFilesByStatus,
} from '@/lib/utils/fileHelpers';
import type { FileItem } from '@/types/files';

describe('isImageFile', () => {
  describe('standard image formats', () => {
    it('returns true for PNG files', () => {
      expect(isImageFile('photo.png')).toBe(true);
      expect(isImageFile('PHOTO.PNG')).toBe(true);
    });

    it('returns true for JPEG files', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('photo.jpeg')).toBe(true);
    });

    it('returns true for other image formats', () => {
      expect(isImageFile('image.gif')).toBe(true);
      expect(isImageFile('image.webp')).toBe(true);
      expect(isImageFile('image.svg')).toBe(true);
      expect(isImageFile('image.bmp')).toBe(true);
      expect(isImageFile('image.heic')).toBe(true);
      expect(isImageFile('image.avif')).toBe(true);
    });
  });

  describe('previewable document formats', () => {
    it('returns true for PDF files', () => {
      expect(isImageFile('document.pdf')).toBe(true);
    });

    it('returns true for PSD files', () => {
      expect(isImageFile('design.psd')).toBe(true);
    });

    it('returns true for Word documents', () => {
      expect(isImageFile('document.docx')).toBe(true);
      expect(isImageFile('document.doc')).toBe(true);
    });

    it('returns true for text files', () => {
      expect(isImageFile('notes.txt')).toBe(true);
      expect(isImageFile('readme.md')).toBe(true);
    });

    it('returns true for video files (frame capture)', () => {
      expect(isImageFile('video.mp4')).toBe(true);
      expect(isImageFile('video.mov')).toBe(true);
      expect(isImageFile('video.mkv')).toBe(true);
    });
  });

  describe('non-previewable files', () => {
    it('returns false for audio files', () => {
      expect(isImageFile('song.mp3')).toBe(false);
      expect(isImageFile('audio.wav')).toBe(false);
    });

    it('returns false for archives', () => {
      expect(isImageFile('archive.zip')).toBe(false);
      expect(isImageFile('archive.tar.gz')).toBe(false);
    });

    it('returns false for code files', () => {
      expect(isImageFile('script.js')).toBe(false);
      expect(isImageFile('app.tsx')).toBe(false);
    });

    it('returns false for unknown extensions', () => {
      expect(isImageFile('file.xyz')).toBe(false);
      expect(isImageFile('data.bin')).toBe(false);
    });
  });
});

describe('formatFileSize', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(5242880)).toBe('5 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('rounds to one decimal place', () => {
    expect(formatFileSize(1234567)).toBe('1.2 MB');
  });
});

describe('getFileExtension', () => {
  it('extracts extension from filename', () => {
    expect(getFileExtension('document.pdf')).toBe('pdf');
    expect(getFileExtension('image.PNG')).toBe('png');
  });

  it('handles multiple dots in filename', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getFileExtension('file.test.js')).toBe('js');
  });

  it('returns empty string for files without extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
    expect(getFileExtension('README')).toBe('');
  });

  it('handles hidden files with extensions', () => {
    expect(getFileExtension('.gitignore')).toBe('gitignore');
    expect(getFileExtension('.env.local')).toBe('local');
  });
});

describe('sortFiles', () => {
  const createFile = (name: string, isDirectory: boolean, size = 0, modified = '2024-01-01'): FileItem => ({
    name,
    path: `/test/${name}`,
    isDirectory,
    size,
    modified,
  });

  const files: FileItem[] = [
    createFile('document.pdf', false, 1024, '2024-01-15'),
    createFile('images', true, 0, '2024-01-10'),
    createFile('archive.zip', false, 2048, '2024-01-05'),
    createFile('notes', true, 0, '2024-01-20'),
    createFile('code.js', false, 512, '2024-01-12'),
  ];

  it('always puts directories first', () => {
    const sorted = sortFiles(files, { field: 'name', direction: 'asc' });
    expect(sorted[0].isDirectory).toBe(true);
    expect(sorted[1].isDirectory).toBe(true);
  });

  it('sorts by name ascending', () => {
    const sorted = sortFiles(files, { field: 'name', direction: 'asc' });
    const fileNames = sorted.filter(f => !f.isDirectory).map(f => f.name);
    expect(fileNames).toEqual(['archive.zip', 'code.js', 'document.pdf']);
  });

  it('sorts by name descending', () => {
    const sorted = sortFiles(files, { field: 'name', direction: 'desc' });
    const fileNames = sorted.filter(f => !f.isDirectory).map(f => f.name);
    expect(fileNames).toEqual(['document.pdf', 'code.js', 'archive.zip']);
  });

  it('sorts by size ascending', () => {
    const sorted = sortFiles(files, { field: 'size', direction: 'asc' });
    const fileSizes = sorted.filter(f => !f.isDirectory).map(f => f.size);
    expect(fileSizes).toEqual([512, 1024, 2048]);
  });

  it('sorts by size descending', () => {
    const sorted = sortFiles(files, { field: 'size', direction: 'desc' });
    const fileSizes = sorted.filter(f => !f.isDirectory).map(f => f.size);
    expect(fileSizes).toEqual([2048, 1024, 512]);
  });

  it('sorts by modified date ascending', () => {
    const sorted = sortFiles(files, { field: 'modified', direction: 'asc' });
    const fileDates = sorted.filter(f => !f.isDirectory).map(f => f.modified);
    expect(fileDates).toEqual(['2024-01-05', '2024-01-12', '2024-01-15']);
  });

  it('sorts by type (extension)', () => {
    const sorted = sortFiles(files, { field: 'type', direction: 'asc' });
    const extensions = sorted.filter(f => !f.isDirectory).map(f => f.name.split('.').pop());
    expect(extensions).toEqual(['js', 'pdf', 'zip']);
  });
});

describe('groupFilesByStatus', () => {
  const createFile = (name: string, path: string, isDirectory = false): FileItem => ({
    name,
    path,
    isDirectory,
    size: 0,
    modified: '2024-01-01',
  });

  it('separates directories from files', () => {
    const files = [
      createFile('folder', '/test/folder', true),
      createFile('file.txt', '/test/file.txt', false),
    ];
    const results = new Map();
    const completed = new Set<string>();

    const grouped = groupFilesByStatus(files, results, completed);
    expect(grouped.directories).toHaveLength(1);
    expect(grouped.unprocessed).toHaveLength(1);
  });

  it('identifies processing files', () => {
    const files = [createFile('processing.txt', '/test/processing.txt')];
    const results = new Map();
    const completed = new Set<string>();
    const processing = new Set(['/test/processing.txt']);

    const grouped = groupFilesByStatus(files, results, completed, processing);
    expect(grouped.processing).toHaveLength(1);
  });

  it('identifies ready to apply files', () => {
    const files = [createFile('ready.txt', '/test/ready.txt')];
    const results = new Map<string, { success: boolean }>();
    results.set('/test/ready.txt', { success: true });
    const completed = new Set<string>();

    const grouped = groupFilesByStatus(files, results, completed);
    expect(grouped.readyToApply).toHaveLength(1);
  });

  it('identifies failed files', () => {
    const files = [createFile('failed.txt', '/test/failed.txt')];
    const results = new Map<string, { success: boolean }>();
    results.set('/test/failed.txt', { success: false });
    const completed = new Set<string>();

    const grouped = groupFilesByStatus(files, results, completed);
    expect(grouped.failed).toHaveLength(1);
  });

  it('identifies completed files', () => {
    const files = [createFile('completed.txt', '/test/completed.txt')];
    const results = new Map<string, { success: boolean }>();
    const completed = new Set(['/test/completed.txt']);

    const grouped = groupFilesByStatus(files, results, completed);
    expect(grouped.completed).toHaveLength(1);
  });

  it('identifies unprocessed files', () => {
    const files = [createFile('new.txt', '/test/new.txt')];
    const results = new Map<string, { success: boolean }>();
    const completed = new Set<string>();

    const grouped = groupFilesByStatus(files, results, completed);
    expect(grouped.unprocessed).toHaveLength(1);
  });
});
