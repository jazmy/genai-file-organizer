import { levenshteinDistance } from '../../utils/levenshtein.js';

describe('levenshteinDistance', () => {
  describe('edge cases', () => {
    test('returns 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    test('returns length of second string when first is empty', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
    });

    test('returns length of first string when second is empty', () => {
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    test('returns 0 for two empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
    });

    test('handles null first string', () => {
      expect(levenshteinDistance(null, 'hello')).toBe(5);
    });

    test('handles null second string', () => {
      expect(levenshteinDistance('hello', null)).toBe(5);
    });

    test('handles both null strings', () => {
      expect(levenshteinDistance(null, null)).toBe(0);
    });

    test('handles undefined strings', () => {
      expect(levenshteinDistance(undefined, 'test')).toBe(4);
      expect(levenshteinDistance('test', undefined)).toBe(4);
    });
  });

  describe('single character operations', () => {
    test('returns 1 for single character insertion', () => {
      expect(levenshteinDistance('cat', 'cats')).toBe(1);
    });

    test('returns 1 for single character deletion', () => {
      expect(levenshteinDistance('cats', 'cat')).toBe(1);
    });

    test('returns 1 for single character substitution', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1);
    });
  });

  describe('multiple operations', () => {
    test('returns correct distance for multiple substitutions', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });

    test('returns correct distance for mixed operations', () => {
      // 'kitten' -> 'sitten' (substitute k->s)
      // 'sitten' -> 'sittin' (substitute e->i)
      // 'sittin' -> 'sitting' (insert g)
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    test('returns correct distance for completely different strings', () => {
      expect(levenshteinDistance('hello', 'world')).toBe(4);
    });
  });

  describe('filename comparisons (real use case)', () => {
    test('measures small edit to suggested filename', () => {
      const suggested = 'inv_amazon_echo-dot_29-99_2024-12-15.pdf';
      const final = 'inv_amazon_echo-dot-4th-gen_29-99_2024-12-15.pdf';
      const distance = levenshteinDistance(suggested, final);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20);
    });

    test('measures large edit to suggested filename', () => {
      const suggested = 'note_project-ideas_2024-12-15.pdf';
      const final = 'meeting_team-sync_q4-planning_2024-12-15.pdf';
      const distance = levenshteinDistance(suggested, final);
      expect(distance).toBeGreaterThan(10);
    });

    test('returns 0 for accepted filename (no edit)', () => {
      const suggested = 'inv_target_groceries_156-43_2024-12-15.pdf';
      expect(levenshteinDistance(suggested, suggested)).toBe(0);
    });
  });

  describe('case sensitivity', () => {
    test('treats different cases as different characters', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(1);
    });

    test('returns higher distance for fully different case', () => {
      expect(levenshteinDistance('HELLO', 'hello')).toBe(5);
    });
  });

  describe('special characters', () => {
    test('handles strings with numbers', () => {
      expect(levenshteinDistance('file123', 'file456')).toBe(3);
    });

    test('handles strings with underscores and hyphens', () => {
      expect(levenshteinDistance('my_file', 'my-file')).toBe(1);
    });

    test('handles strings with spaces', () => {
      expect(levenshteinDistance('hello world', 'hello_world')).toBe(1);
    });
  });
});
