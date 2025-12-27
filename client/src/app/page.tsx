'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatusBar } from '@/components/layout/StatusBar';
import { FileBrowser } from '@/components/files/FileBrowser';
import { HistoryPanel } from '@/components/panels/HistoryPanel';
import { PerformancePanel } from '@/components/panels/PerformancePanel';
import { FolderTreePanel } from '@/components/panels/FolderTreePanel';
import { KeyboardShortcutsModal } from '@/components/modals/KeyboardShortcutsModal';
import { KeyboardShortcutsProvider, useKeyboardShortcuts } from '@/components/providers/KeyboardShortcutsProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { ResumeBanner } from '@/components/ui/ResumeBanner';
import { LLMStatusBanner } from '@/components/ui/LLMStatusBanner';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { useProcessing } from '@/hooks/useProcessing';
import { useFiles } from '@/hooks/useFiles';
import { useUndo } from '@/hooks/useUndo';
import { getConfig } from '@/lib/api/config';
import { clearPendingQueue } from '@/lib/api/processing';
import type { PendingQueueResponse } from '@/types/api';

// Inner component that uses the keyboard shortcuts context
function HomeContent() {
  const [initialized, setInitialized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showFolderTree, setShowFolderTree] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<PendingQueueResponse | null>(null);
  const { shortcuts, showShortcutsModal, setShowShortcutsModal } = useKeyboardShortcuts();

  const { loadFiles, setPath } = useFileStore();
  const { theme, setTheme } = useUIStore();
  const { previewSelected, regenerateFile, applyAll, applySingle, keepOriginal, keepOriginalSelected, editSuggestedName, checkPendingQueue, resumeProcessing } =
    useProcessing();
  const { deleteFile, directRename, deleteSelected } = useFiles();

  // Initialize undo/redo keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
  useUndo();

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        // Load config
        const config = await getConfig();
        const defaultPath = config.ui?.defaultPath || '/';
        const savedTheme = config.ui?.theme || 'dark';

        setPath(defaultPath);
        setTheme(savedTheme);

        // Apply theme to document
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');

        // Load files
        await loadFiles(defaultPath);

        // Check for pending queue (files that were being processed when browser closed)
        try {
          const pending = await checkPendingQueue();
          if (pending) {
            setPendingQueue(pending);
            // Note: Don't call restoreProcessingFiles here - files should show normally
            // They'll be marked as processing when user clicks Resume
          }
        } catch {
          // Ignore
        }

        setInitialized(true);
      } catch (err) {
        console.error('Failed to initialize:', err);
        setInitialized(true);
      }
    };

    init();
  }, []);

  // Sync theme with document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (!initialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" aria-label="Loading" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading GenOrganize...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }} className="bg-zinc-100 dark:bg-zinc-950">
      {/* LLM Status Banner - shown when AI provider is offline */}
      <LLMStatusBanner />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Skip link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
        >
          Skip to main content
        </a>

        {/* Sidebar */}
        <Sidebar
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(!showHistory)}
          showPerformance={showPerformance}
          onTogglePerformance={() => setShowPerformance(!showPerformance)}
          showFolderTree={showFolderTree}
          onToggleFolderTree={() => setShowFolderTree(!showFolderTree)}
        />

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} role="main">
          {/* Resume Banner - shown when there are pending files from interrupted processing */}
          <AnimatePresence>
            {pendingQueue && (
              <ResumeBanner
                pendingQueue={pendingQueue}
                onResume={() => {
                  // Dismiss banner immediately, then start processing
                  const queueToProcess = pendingQueue;
                  setPendingQueue(null);
                  resumeProcessing(queueToProcess);
                }}
                onDismiss={async () => {
                  // Clear the pending queue from the database
                  try {
                    await clearPendingQueue();
                  } catch {
                    // Ignore errors
                  }
                  setPendingQueue(null);
                }}
              />
            )}
          </AnimatePresence>

          {/* Header */}
          <Header
            onPreviewAll={previewSelected}
            onApplyAll={applyAll}
            onKeepOriginalSelected={keepOriginalSelected}
            onDeleteSelected={deleteSelected}
          />

          {/* File Browser with History Panel */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <main id="main-content" style={{ flex: 1, overflow: 'auto' }} tabIndex={-1}>
              <FileBrowser
                onRegenerate={regenerateFile}
                onApply={applySingle}
                onKeepOriginal={keepOriginal}
                onEdit={editSuggestedName}
                onDelete={deleteFile}
                onDirectRename={directRename}
              />
            </main>

            {/* History Panel */}
            {showHistory && (
              <HistoryPanel
                onClose={() => setShowHistory(false)}
                className="w-80 flex-shrink-0"
              />
            )}

            {/* Performance Panel */}
            {showPerformance && (
              <PerformancePanel
                onClose={() => setShowPerformance(false)}
                className="w-80 flex-shrink-0"
              />
            )}

            {/* Folder Tree Panel */}
            {showFolderTree && (
              <FolderTreePanel
                onClose={() => setShowFolderTree(false)}
                onNavigate={async (path) => {
                  setPath(path);
                  await loadFiles(path);
                }}
                className="w-80 flex-shrink-0"
              />
            )}
          </div>

          {/* Status Bar */}
          <StatusBar />
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={shortcuts}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function Home() {
  return (
    <KeyboardShortcutsProvider>
      <HomeContent />
    </KeyboardShortcutsProvider>
  );
}
