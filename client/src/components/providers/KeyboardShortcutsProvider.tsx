'use client';

import { useEffect, useCallback, createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardNavigation, KeyboardShortcut } from '@/hooks/useKeyboardNavigation';

interface KeyboardShortcutsContextValue {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (show: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
  onOpenSearch?: () => void;
}

export function KeyboardShortcutsProvider({
  children,
  onOpenSearch,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const [customShortcuts, setCustomShortcuts] = useState<KeyboardShortcut[]>([]);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Build complete shortcuts list
  const buildShortcuts = useCallback((): KeyboardShortcut[] => {
    const appShortcuts: KeyboardShortcut[] = [
      {
        key: 'k',
        modifiers: { ctrl: true },
        handler: () => onOpenSearch?.(),
        description: 'Open quick search',
        category: 'Navigation',
      },
      {
        key: '/',
        modifiers: {},
        handler: () => onOpenSearch?.(),
        description: 'Open quick search',
        category: 'Navigation',
      },
      {
        key: ',',
        modifiers: { ctrl: true },
        handler: () => router.push('/settings'),
        description: 'Open settings',
        category: 'Navigation',
      },
      {
        key: 'Escape',
        modifiers: {},
        handler: () => {
          setShowShortcutsModal(false);
        },
        description: 'Close dialog',
        category: 'General',
      },
      {
        key: '?',
        modifiers: { shift: true },
        handler: () => setShowShortcutsModal(true),
        description: 'Show keyboard shortcuts',
        category: 'Help',
      },
      // Note: Undo/redo are handled by useUndo hook, listed here for display
      {
        key: 'z',
        modifiers: { ctrl: true },
        handler: () => {}, // Handled by useUndo hook
        description: 'Undo last action',
        category: 'Edit',
        enabled: false, // Don't double-handle
      },
      {
        key: 'z',
        modifiers: { ctrl: true, shift: true },
        handler: () => {}, // Handled by useUndo hook
        description: 'Redo last action',
        category: 'Edit',
        enabled: false, // Don't double-handle
      },
    ];

    return [...appShortcuts, ...customShortcuts];
  }, [onOpenSearch, router, customShortcuts]);

  const shortcuts = buildShortcuts();

  // Register global keyboard handler
  useKeyboardNavigation({
    shortcuts,
    global: true,
    disableOnInput: true,
  });

  // Listen for custom events
  useEffect(() => {
    const handleOpenSearch = () => onOpenSearch?.();
    const handleCloseModals = () => {
      setShowShortcutsModal(false);
    };
    const handleShowShortcuts = () => setShowShortcutsModal(true);

    document.addEventListener('openSearch', handleOpenSearch);
    document.addEventListener('closeModals', handleCloseModals);
    document.addEventListener('showShortcuts', handleShowShortcuts);

    return () => {
      document.removeEventListener('openSearch', handleOpenSearch);
      document.removeEventListener('closeModals', handleCloseModals);
      document.removeEventListener('showShortcuts', handleShowShortcuts);
    };
  }, [onOpenSearch]);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setCustomShortcuts((prev) => {
      // Replace if exists, otherwise add
      const exists = prev.findIndex((s) => s.key === shortcut.key);
      if (exists >= 0) {
        const newShortcuts = [...prev];
        newShortcuts[exists] = shortcut;
        return newShortcuts;
      }
      return [...prev, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setCustomShortcuts((prev) => prev.filter((s) => s.key !== key));
  }, []);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        showShortcutsModal,
        setShowShortcutsModal,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export default KeyboardShortcutsProvider;
