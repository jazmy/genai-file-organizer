'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useFocusTrap } from '@/hooks/useKeyboardNavigation';
import type { KeyboardShortcut } from '@/hooks/useKeyboardNavigation';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

function formatKey(key: string, modifiers?: KeyboardShortcut['modifiers']): string[] {
  const keys: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  if (modifiers?.ctrl) {
    keys.push(isMac ? '⌘' : 'Ctrl');
  }
  if (modifiers?.meta) {
    keys.push(isMac ? '⌘' : 'Win');
  }
  if (modifiers?.alt) {
    keys.push(isMac ? '⌥' : 'Alt');
  }
  if (modifiers?.shift) {
    keys.push('⇧');
  }

  // Format special keys
  const keyMap: Record<string, string> = {
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↵',
    ' ': 'Space',
  };

  keys.push(keyMap[key] || key.toUpperCase());

  return keys;
}

function KeyBadge({ children }: { children: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5',
        'bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600',
        'rounded text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300',
        'shadow-sm'
      )}
    >
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsModalProps) {
  const containerRef = useFocusTrap(isOpen);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {};
    shortcuts.forEach((shortcut) => {
      const category = shortcut.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(shortcut);
    });
    return groups;
  }, [shortcuts]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-title"
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Keyboard className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2
                    id="shortcuts-title"
                    className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut, index) => {
                        const keys = formatKey(shortcut.key, shortcut.modifiers);
                        return (
                          <div
                            key={`${shortcut.key}-${index}`}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {keys.map((key, keyIndex) => (
                                <KeyBadge key={keyIndex}>{key}</KeyBadge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Additional shortcuts info */}
                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                    List Navigation
                  </h3>
                  <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between py-2 px-3">
                      <span>Navigate up/down</span>
                      <div className="flex items-center gap-1">
                        <KeyBadge>↑</KeyBadge>
                        <KeyBadge>↓</KeyBadge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3">
                      <span>Jump to first/last</span>
                      <div className="flex items-center gap-1">
                        <KeyBadge>Home</KeyBadge>
                        <KeyBadge>End</KeyBadge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3">
                      <span>Select item</span>
                      <div className="flex items-center gap-1">
                        <KeyBadge>↵</KeyBadge>
                        <span className="text-zinc-400 mx-1">or</span>
                        <KeyBadge>Space</KeyBadge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                  Press <KeyBadge>Esc</KeyBadge> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default KeyboardShortcutsModal;
