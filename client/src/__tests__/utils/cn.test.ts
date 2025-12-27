import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn utility', () => {
  describe('basic class merging', () => {
    it('returns empty string for no arguments', () => {
      expect(cn()).toBe('');
    });

    it('returns single class unchanged', () => {
      expect(cn('text-red-500')).toBe('text-red-500');
    });

    it('merges multiple classes', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });
  });

  describe('conditional classes', () => {
    it('handles boolean conditions', () => {
      expect(cn('base', true && 'active')).toBe('base active');
      expect(cn('base', false && 'active')).toBe('base');
    });

    it('handles object syntax', () => {
      expect(cn({ 'text-red-500': true, 'bg-blue-500': false })).toBe('text-red-500');
    });

    it('handles mixed arguments', () => {
      expect(cn('base', { active: true, disabled: false }, 'extra')).toBe('base active extra');
    });
  });

  describe('tailwind conflict resolution', () => {
    it('resolves color conflicts (last wins)', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('resolves padding conflicts', () => {
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('resolves margin conflicts', () => {
      expect(cn('mx-2', 'mx-auto')).toBe('mx-auto');
    });

    it('keeps non-conflicting classes', () => {
      expect(cn('text-red-500', 'bg-blue-500', 'text-white')).toBe('bg-blue-500 text-white');
    });

    it('resolves flex direction conflicts', () => {
      expect(cn('flex-col', 'flex-row')).toBe('flex-row');
    });
  });

  describe('null and undefined handling', () => {
    it('ignores null values', () => {
      expect(cn('base', null, 'extra')).toBe('base extra');
    });

    it('ignores undefined values', () => {
      expect(cn('base', undefined, 'extra')).toBe('base extra');
    });

    it('handles array of classes', () => {
      expect(cn(['base', 'extra'])).toBe('base extra');
    });
  });

  describe('real-world component patterns', () => {
    it('handles button variant pattern', () => {
      const variant = 'primary';
      const className = cn(
        'px-4 py-2 rounded',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800'
      );
      expect(className).toBe('px-4 py-2 rounded bg-blue-500 text-white');
    });

    it('handles disabled state pattern', () => {
      const disabled = true;
      const className = cn(
        'cursor-pointer',
        disabled && 'cursor-not-allowed opacity-50'
      );
      expect(className).toBe('cursor-not-allowed opacity-50');
    });
  });
});
