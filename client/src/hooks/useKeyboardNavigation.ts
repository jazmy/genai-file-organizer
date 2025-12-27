'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean;
    alt?: boolean;
    shift?: boolean;
  };
  handler: (event: KeyboardEvent) => void;
  description: string;
  category?: string;
  enabled?: boolean;
}

interface UseKeyboardNavigationOptions {
  /** List of shortcuts to register */
  shortcuts?: KeyboardShortcut[];
  /** Enable global shortcuts (works even when focused on other elements) */
  global?: boolean;
  /** Disable shortcuts when focused on input elements */
  disableOnInput?: boolean;
}

/**
 * Hook for managing keyboard shortcuts and navigation
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { shortcuts = [], global = false, disableOnInput = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Check if focused element is an input
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    const isEditable = activeElement.getAttribute('contenteditable') === 'true';

    return isInput || isEditable;
  }, []);

  // Main keyboard handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if disabled on input and input is focused
    if (disableOnInput && isInputFocused()) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue;

      const { key, modifiers = {}, handler } = shortcut;
      const { ctrl = false, meta = false, alt = false, shift = false } = modifiers;

      // Check if key matches (case-insensitive)
      const keyMatch = event.key.toLowerCase() === key.toLowerCase() ||
        event.code.toLowerCase() === key.toLowerCase();

      // Check modifiers
      const modifierMatch =
        (ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey) &&
        (meta ? event.metaKey : !meta && !event.metaKey) &&
        (alt ? event.altKey : !event.altKey) &&
        (shift ? event.shiftKey : !event.shiftKey);

      // Handle Cmd on Mac, Ctrl on Windows
      const cmdOrCtrl = ctrl || meta;
      const cmdOrCtrlMatch = cmdOrCtrl
        ? (event.ctrlKey || event.metaKey)
        : (!event.ctrlKey && !event.metaKey);

      if (keyMatch && (cmdOrCtrl ? cmdOrCtrlMatch : modifierMatch)) {
        event.preventDefault();
        handler(event);
        return;
      }
    }
  }, [disableOnInput, isInputFocused]);

  // Register global listener
  useEffect(() => {
    if (!global) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [global, handleKeyDown]);

  return {
    handleKeyDown,
    isInputFocused,
  };
}

/**
 * Hook for managing focus within a list of items
 */
export function useListNavigation<T extends HTMLElement = HTMLElement>(
  items: number,
  options: {
    initialIndex?: number;
    loop?: boolean;
    onSelect?: (index: number) => void;
    onEscape?: () => void;
    horizontal?: boolean;
  } = {}
) {
  const { initialIndex = -1, loop = true, onSelect, onEscape, horizontal = false } = options;
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const itemRefs = useRef<(T | null)[]>([]);

  // Reset refs when items count changes
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items);
  }, [items]);

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < items && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, items]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';

    switch (event.key) {
      case prevKey:
        event.preventDefault();
        setFocusedIndex((prev) => {
          if (prev <= 0) {
            return loop ? items - 1 : 0;
          }
          return prev - 1;
        });
        break;

      case nextKey:
        event.preventDefault();
        setFocusedIndex((prev) => {
          if (prev >= items - 1) {
            return loop ? 0 : items - 1;
          }
          return prev + 1;
        });
        break;

      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedIndex(items - 1);
        break;

      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && onSelect) {
          event.preventDefault();
          onSelect(focusedIndex);
        }
        break;

      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
    }
  }, [focusedIndex, items, loop, horizontal, onSelect, onEscape]);

  const setItemRef = useCallback((index: number) => (el: T | null) => {
    itemRefs.current[index] = el;
  }, []);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    setItemRef,
    itemProps: (index: number) => ({
      ref: setItemRef(index),
      tabIndex: index === focusedIndex ? 0 : -1,
      'aria-selected': index === focusedIndex,
      onKeyDown: handleKeyDown,
    }),
  };
}

/**
 * Hook for focus trapping (modals, dropdowns)
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store current focus
    previousActiveElement.current = document.activeElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    };

    // Focus first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle tab key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Default keyboard shortcuts for the application
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'k',
    modifiers: { ctrl: true },
    handler: () => document.dispatchEvent(new CustomEvent('openSearch')),
    description: 'Open quick search',
    category: 'Navigation',
  },
  {
    key: '/',
    modifiers: {},
    handler: () => document.dispatchEvent(new CustomEvent('openSearch')),
    description: 'Open quick search',
    category: 'Navigation',
  },
  {
    key: 'Escape',
    modifiers: {},
    handler: () => document.dispatchEvent(new CustomEvent('closeModals')),
    description: 'Close dialog',
    category: 'General',
  },
  {
    key: '?',
    modifiers: { shift: true },
    handler: () => document.dispatchEvent(new CustomEvent('showShortcuts')),
    description: 'Show keyboard shortcuts',
    category: 'Help',
  },
];

export default useKeyboardNavigation;
