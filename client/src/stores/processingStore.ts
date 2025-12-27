import { create } from 'zustand';

interface InterruptedBatch {
  batchId: string;
  queue: string[];
  processedFiles: string[];
  currentIndex: number;
  total: number;
  directory: string | null;
  startedAt: string;
  interruptedAt: string;
}

interface ProcessingStore {
  // State
  isProcessing: boolean;
  isBatchProcessing: boolean;
  isApplying: boolean;
  applyingCount: number;
  queue: string[];
  currentIndex: number;
  total: number;
  batchId: string | null;
  regeneratingFiles: Set<string>;
  currentDirectory: string | null;
  processedInCurrentBatch: string[];

  // Persistence state
  interruptedBatch: InterruptedBatch | null;
  hasInterruptedBatch: boolean;

  // Actions
  startBatch: (files: string[], batchId?: string, directory?: string) => void;
  setProgress: (current: number, total: number) => void;
  incrementProgress: () => void;
  markFileProcessed: (path: string) => void;
  endBatch: () => void;
  cancelBatch: () => void;
  setRegenerating: (path: string, status: boolean) => void;
  isRegenerating: (path: string) => boolean;
  restoreProcessingFiles: (files: string[]) => void;
  startApplying: (count: number) => void;
  endApplying: () => void;

  // Persistence actions
  saveInterruptedBatch: () => void;
  restoreInterruptedBatch: () => InterruptedBatch | null;
  clearInterruptedBatch: () => void;
  getRemainingFiles: () => string[];
}

// Storage key for persistence
const STORAGE_KEY = 'genorganize-processing-state';

// Helper to load interrupted batch from localStorage
const loadInterruptedBatch = (): InterruptedBatch | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

// Helper to save interrupted batch to localStorage
const saveToStorage = (batch: InterruptedBatch | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (batch) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(batch));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
};

export const useProcessingStore = create<ProcessingStore>((set, get) => {
  // Load interrupted batch on initialization
  const savedBatch = loadInterruptedBatch();

  return {
    // Initial state
    isProcessing: false,
    isBatchProcessing: false,
    isApplying: false,
    applyingCount: 0,
    queue: [],
    currentIndex: 0,
    total: 0,
    batchId: null,
    regeneratingFiles: new Set(),
    currentDirectory: null,
    processedInCurrentBatch: [],

    // Persistence state
    interruptedBatch: savedBatch,
    hasInterruptedBatch: savedBatch !== null,

    // Actions
    startBatch: (files, batchId, directory) => {
      const id = batchId || `batch-${Date.now()}`;
      set({
        isProcessing: true,
        isBatchProcessing: true,
        queue: files,
        currentIndex: 0,
        total: files.length,
        batchId: id,
        currentDirectory: directory || null,
        processedInCurrentBatch: [],
      });

      // Save initial batch state
      saveToStorage({
        batchId: id,
        queue: files,
        processedFiles: [],
        currentIndex: 0,
        total: files.length,
        directory: directory || null,
        startedAt: new Date().toISOString(),
        interruptedAt: new Date().toISOString(),
      });
    },

    setProgress: (current, total) => {
      set({
        currentIndex: current,
        total: total,
      });

      // Update saved batch
      const state = get();
      if (state.batchId) {
        saveToStorage({
          batchId: state.batchId,
          queue: state.queue,
          processedFiles: state.processedInCurrentBatch,
          currentIndex: current,
          total: total,
          directory: state.currentDirectory,
          startedAt: state.interruptedBatch?.startedAt || new Date().toISOString(),
          interruptedAt: new Date().toISOString(),
        });
      }
    },

    incrementProgress: () => {
      set((state) => ({
        currentIndex: state.currentIndex + 1,
      }));
    },

    markFileProcessed: (path) => {
      set((state) => ({
        processedInCurrentBatch: [...state.processedInCurrentBatch, path],
      }));

      // Update saved batch
      const state = get();
      if (state.batchId) {
        saveToStorage({
          batchId: state.batchId,
          queue: state.queue,
          processedFiles: state.processedInCurrentBatch,
          currentIndex: state.currentIndex,
          total: state.total,
          directory: state.currentDirectory,
          startedAt: state.interruptedBatch?.startedAt || new Date().toISOString(),
          interruptedAt: new Date().toISOString(),
        });
      }
    },

    endBatch: () => {
      set({
        isProcessing: false,
        isBatchProcessing: false,
        queue: [],
        currentIndex: 0,
        total: 0,
        batchId: null,
        currentDirectory: null,
        processedInCurrentBatch: [],
        interruptedBatch: null,
        hasInterruptedBatch: false,
      });

      // Clear saved batch
      saveToStorage(null);
    },

    cancelBatch: () => {
      // Save state before canceling so it can be resumed
      const state = get();
      if (state.batchId && state.queue.length > 0) {
        const interrupted: InterruptedBatch = {
          batchId: state.batchId,
          queue: state.queue,
          processedFiles: state.processedInCurrentBatch,
          currentIndex: state.currentIndex,
          total: state.total,
          directory: state.currentDirectory,
          startedAt: state.interruptedBatch?.startedAt || new Date().toISOString(),
          interruptedAt: new Date().toISOString(),
        };
        saveToStorage(interrupted);
        set({
          interruptedBatch: interrupted,
          hasInterruptedBatch: true,
        });
      }

      set({
        isProcessing: false,
        isBatchProcessing: false,
        queue: [],
        currentIndex: 0,
        total: 0,
        batchId: null,
        currentDirectory: null,
        processedInCurrentBatch: [],
      });
    },

    setRegenerating: (path, status) => {
      const { regeneratingFiles } = get();
      const newSet = new Set(regeneratingFiles);
      if (status) {
        newSet.add(path);
      } else {
        newSet.delete(path);
      }
      set({ regeneratingFiles: newSet });
    },

    isRegenerating: (path) => get().regeneratingFiles.has(path),

    restoreProcessingFiles: (files) => {
      set({ regeneratingFiles: new Set(files) });
    },

    startApplying: (count) => {
      set({ isApplying: true, applyingCount: count });
    },

    endApplying: () => {
      set({ isApplying: false, applyingCount: 0 });
    },

    // Persistence actions
    saveInterruptedBatch: () => {
      const state = get();
      if (state.batchId && state.queue.length > 0) {
        const interrupted: InterruptedBatch = {
          batchId: state.batchId,
          queue: state.queue,
          processedFiles: state.processedInCurrentBatch,
          currentIndex: state.currentIndex,
          total: state.total,
          directory: state.currentDirectory,
          startedAt: state.interruptedBatch?.startedAt || new Date().toISOString(),
          interruptedAt: new Date().toISOString(),
        };
        saveToStorage(interrupted);
        set({
          interruptedBatch: interrupted,
          hasInterruptedBatch: true,
        });
      }
    },

    restoreInterruptedBatch: () => {
      const saved = loadInterruptedBatch();
      if (saved) {
        set({
          interruptedBatch: saved,
          hasInterruptedBatch: true,
        });
      }
      return saved;
    },

    clearInterruptedBatch: () => {
      saveToStorage(null);
      set({
        interruptedBatch: null,
        hasInterruptedBatch: false,
      });
    },

    getRemainingFiles: () => {
      const state = get();
      if (!state.interruptedBatch) return [];

      const processed = new Set(state.interruptedBatch.processedFiles);
      return state.interruptedBatch.queue.filter((f) => !processed.has(f));
    },
  };
});
