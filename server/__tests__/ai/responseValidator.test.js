import { ResponseValidator } from '../../ai/responseValidator.js';

describe('ResponseValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ResponseValidator();
  });

  describe('validateCategory', () => {
    test('validates known category directly', () => {
      const result = validator.validateCategory('invoice');
      expect(result.valid).toBe(true);
      expect(result.category).toBe('invoice');
      expect(result.fallback).toBe(false);
    });

    test('handles category with extra whitespace', () => {
      const result = validator.validateCategory('  screenshot  \n');
      expect(result.valid).toBe(true);
      expect(result.category).toBe('screenshot');
    });

    test('handles category with prefix', () => {
      const result = validator.validateCategory('Category: meeting_notes');
      expect(result.valid).toBe(true);
      expect(result.category).toBe('meeting_notes');
    });

    test('handles unknown category with fallback', () => {
      const result = validator.validateCategory('unknown_xyz');
      expect(result.fallback).toBe(true);
      expect(result.category).toBe('note');
    });

    test('matches partial category names', () => {
      const result = validator.validateCategory('this is a photo file');
      expect(result.valid).toBe(true);
      expect(result.category).toBe('photo');
    });

    test('accepts receipt as a valid category', () => {
      const result = validator.validateCategory('receipt');
      expect(result.valid).toBe(true);
      expect(result.category).toBe('receipt');
    });

    test('handles empty response', () => {
      const result = validator.validateCategory('');
      expect(result.valid).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.category).toBe('note');
    });

    test('handles null response', () => {
      const result = validator.validateCategory(null);
      expect(result.valid).toBe(false);
      expect(result.fallback).toBe(true);
    });
  });

  describe('validateFilename', () => {
    test('validates standard filename format', () => {
      const result = validator.validateFilename(
        'invoice_amazon_purchase_2024-12-15.pdf',
        'original.pdf'
      );
      expect(result.valid).toBe(true);
      expect(result.filename).toBe('invoice_amazon_purchase_2024-12-15.pdf');
    });

    test('extracts filename from markdown code block', () => {
      const result = validator.validateFilename(
        '```\nnote_meeting_summary.txt\n```',
        'file.txt'
      );
      expect(result.valid).toBe(true);
      expect(result.filename).toBe('note_meeting_summary.txt');
    });

    test('extracts filename from multi-line response', () => {
      const result = validator.validateFilename(
        'Based on the content, I suggest:\nnote_project-ideas_2024-12-15.md',
        'file.md'
      );
      expect(result.valid).toBe(true);
      expect(result.filename).toBe('note_project-ideas_2024-12-15.md');
    });

    test('removes dangerous characters', () => {
      const result = validator.validateFilename(
        'note_file<name>with:bad*chars?.txt',
        'original.txt'
      );
      expect(result.valid).toBe(true);
      expect(result.filename).not.toContain('<');
      expect(result.filename).not.toContain('>');
      expect(result.filename).not.toContain(':');
    });

    test('uses original extension when AI returns invalid one', () => {
      const result = validator.validateFilename(
        'document_my_file.verylongextension',
        'original.pdf'
      );
      expect(result.valid).toBe(true);
      expect(result.filename).toMatch(/\.pdf$/);
    });

    test('handles empty filename', () => {
      const result = validator.validateFilename('', 'original.pdf');
      expect(result.valid).toBe(false);
      expect(result.fallback).toBe(true);
    });

    test('truncates very long filenames', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = validator.validateFilename(longName, 'original.pdf');
      expect(result.filename.length).toBeLessThan(220);
    });

    test('rejects filenames without valid prefix', () => {
      // Filenames must start with a valid category prefix
      const result = validator.validateFilename('CON.txt', 'original.txt');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('prefix');
    });
  });

  describe('sanitizeFilename', () => {
    test('removes path separators', () => {
      const result = validator.sanitizeFilename('path/to/file.txt', 'original.txt');
      expect(result.filename).not.toContain('/');
      expect(result.filename).not.toContain('\\');
    });

    test('replaces multiple spaces with underscore', () => {
      const result = validator.sanitizeFilename('file   name.txt', 'original.txt');
      expect(result.filename).toBe('file_name.txt');
    });

    test('removes leading/trailing dots', () => {
      const result = validator.sanitizeFilename('...file....txt', 'original.txt');
      expect(result.filename).not.toMatch(/^\./);
    });
  });

  describe('generateFallback', () => {
    test('generates fallback with category prefix', () => {
      const result = validator.generateFallback('invoice', 'receipt123.pdf');
      expect(result).toMatch(/^invoice_/);
      expect(result).toMatch(/\.pdf$/);
    });

    test('extracts date from filename for fallback', () => {
      // Should extract MAY_2024 as 2024-05
      const result = validator.generateFallback('meeting_notes', 'MAY_2024_MINUTES.doc');
      expect(result).toContain('2024-05');
      expect(result).not.toContain(new Date().toISOString().split('T')[0]); // Should NOT have today's date
    });

    test('omits date if none in original filename', () => {
      const result = validator.generateFallback('note', 'file.txt');
      // Should NOT contain today's date
      expect(result).not.toContain(new Date().toISOString().split('T')[0]);
      expect(result).toBe('note_file.txt');
    });

    test('extracts meaningful parts from original filename', () => {
      const result = validator.generateFallback('photo', 'vacation-beach-sunset.jpg');
      expect(result).toContain('vacation');
    });

    test('uses default category for unknown categories', () => {
      const result = validator.generateFallback('unknown_category', 'file.txt');
      expect(result).toMatch(/^file_/);
    });
  });

  describe('looksLikeFilename', () => {
    test('returns true for valid filename', () => {
      expect(validator.looksLikeFilename('document.pdf')).toBe(true);
    });

    test('returns false for string without extension', () => {
      expect(validator.looksLikeFilename('noextension')).toBe(false);
    });

    test('returns false for very short strings', () => {
      expect(validator.looksLikeFilename('a')).toBe(false);
    });

    test('returns false for very long strings', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(validator.looksLikeFilename(longName)).toBe(false);
    });
  });

  describe('validateResponse (full)', () => {
    test('validates complete AI response', () => {
      const result = validator.validateResponse(
        'invoice',
        'invoice_amazon_purchase_2024-12-15.pdf',
        'original.pdf'
      );
      expect(result.fullyValid).toBe(true);
      expect(result.category.valid).toBe(true);
      expect(result.filename.valid).toBe(true);
    });

    test('uses fallback for invalid responses', () => {
      const result = validator.validateResponse(
        'completely_invalid_category_xyz',
        '',
        'original.pdf'
      );
      expect(result.category.fallback).toBe(true);
      expect(result.filename.fallbackUsed).toBe(true);
      expect(result.filename.final).toBeTruthy();
      expect(result.filename.final).toMatch(/\.pdf$/);
    });
  });

  describe('failure logging', () => {
    test('logs validation failures', () => {
      validator.validateCategory('unknown_xyz_abc');
      const failures = validator.getRecentFailures();
      expect(failures.length).toBeGreaterThan(0);
      expect(failures[0].type).toBe('category');
    });

    test('limits stored failures', () => {
      validator.maxFailureLog = 5;
      for (let i = 0; i < 10; i++) {
        validator.validateCategory(`unknown_${i}`);
      }
      const failures = validator.getRecentFailures();
      expect(failures.length).toBeLessThanOrEqual(5);
    });
  });
});
