import { create } from 'zustand';
import type { FileItem, ProcessResult, SortConfig, ViewMode } from '@/types/files';
import { listFiles, getCachedByDirectory } from '@/lib/api/files';

// Info about a file that was moved by auto-organize
export interface MovedFileInfo {
  originalPath: string;
  newPath: string;
  originalName: string;
  newName: string;
  category: string;
  appliedAt: string;
}

interface FileStore {
  // State
  currentPath: string;
  files: FileItem[];
  results: Map<string, ProcessResult>;
  completedFiles: Set<string>;
  movedFiles: MovedFileInfo[]; // Files that were in this directory but moved elsewhere
  selectedFiles: Set<string>;
  loading: boolean;
  error: string | null;
  sortConfig: SortConfig;
  viewMode: ViewMode;

  // Actions
  setPath: (path: string) => void;
  loadFiles: (path?: string) => Promise<void>;
  setFiles: (files: FileItem[]) => void;
  removeFile: (path: string) => void;
  renameFileInList: (oldPath: string, newPath: string, newName: string) => void;
  selectFile: (path: string, selected: boolean) => void;
  selectAll: (selected: boolean) => void;
  selectUnprocessed: (selected: boolean) => void;
  clearSelection: () => void;
  addResult: (path: string, result: ProcessResult) => void;
  removeResult: (path: string) => void;
  updateResult: (path: string, updates: Partial<ProcessResult>) => void;
  clearResults: () => void;
  markComplete: (path: string) => void;
  unmarkComplete: (path: string) => void;
  setSortConfig: (config: SortConfig) => void;
  setViewMode: (mode: ViewMode) => void;
  setError: (error: string | null) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  // Initial state
  currentPath: '/',
  files: [],
  results: new Map(),
  completedFiles: new Set(),
  movedFiles: [],
  selectedFiles: new Set(),
  loading: false,
  error: null,
  sortConfig: { field: 'name', direction: 'asc' },
  viewMode: 'grid',

  // Actions
  setPath: (path) => set({ currentPath: path }),

  loadFiles: async (path?: string) => {
    const targetPath = path ?? get().currentPath;
    set({ loading: true, error: null });

    try {
      const response = await listFiles(targetPath);

      // Load cached results and applied files for this directory
      let cachedResults = new Map<string, ProcessResult>();
      let appliedFiles = new Set<string>();
      let movedFilesList: MovedFileInfo[] = [];
      try {
        const cached = await getCachedByDirectory(targetPath);
        // Load pending/previewed files as results (ready to apply)
        if (cached.pending && Array.isArray(cached.pending)) {
          cached.pending.forEach((file: { original_path: string; suggested_name: string; ai_suggested_name?: string; category: string }) => {
            cachedResults.set(file.original_path, {
              success: true,
              filePath: file.original_path,
              originalName: file.original_path.split('/').pop() || '',
              suggestedName: file.suggested_name,
              aiSuggestedName: file.ai_suggested_name || file.suggested_name,
              category: file.category,
              extension: file.suggested_name.split('.').pop() || '',
              processingTime: 0,
            });
          });
        }
        // Load applied files - separate into completed (stayed) vs moved (different directory)
        if (cached.applied && Array.isArray(cached.applied)) {
          cached.applied.forEach((file: {
            original_path: string;
            new_path: string | null;
            status: string;
            original_name: string;
            suggested_name: string;
            category: string;
            applied_at: string;
          }) => {
            if (file.status === 'skipped') {
              // Skipped files - stayed in place with original name
              appliedFiles.add(file.original_path);
            } else if (file.status === 'applied' && file.new_path) {
              // Check if file was moved to a different directory
              const originalDir = file.original_path.substring(0, file.original_path.lastIndexOf('/'));
              const newDir = file.new_path.substring(0, file.new_path.lastIndexOf('/'));

              if (originalDir === newDir) {
                // Stayed in same directory - mark as completed
                appliedFiles.add(file.new_path);
              } else if (originalDir === targetPath || file.original_path.startsWith(targetPath + '/')) {
                // File was originally in this directory but moved elsewhere
                movedFilesList.push({
                  originalPath: file.original_path,
                  newPath: file.new_path,
                  originalName: file.original_name || file.original_path.split('/').pop() || '',
                  newName: file.suggested_name || file.new_path.split('/').pop() || '',
                  category: file.category || '',
                  appliedAt: file.applied_at || '',
                });
              } else {
                // File's new_path is in this directory (moved here from elsewhere)
                appliedFiles.add(file.new_path);
              }
            }
          });
        }
      } catch {
        // Ignore cache errors
      }

      // Sort moved files by applied_at descending (most recent first)
      movedFilesList.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

      set({
        currentPath: targetPath,
        files: response.items,
        results: cachedResults,
        completedFiles: appliedFiles,
        movedFiles: movedFilesList,
        loading: false,
        selectedFiles: new Set(),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load files',
        loading: false,
      });
    }
  },

  setFiles: (files) => set({ files }),

  removeFile: (path) => {
    const { files, selectedFiles, results, completedFiles } = get();
    // Remove from files array
    const newFiles = files.filter((f) => f.path !== path);
    // Remove from selected files
    const newSelected = new Set(selectedFiles);
    newSelected.delete(path);
    // Remove from results
    const newResults = new Map(results);
    newResults.delete(path);
    // Remove from completed files
    const newCompleted = new Set(completedFiles);
    newCompleted.delete(path);
    set({ files: newFiles, selectedFiles: newSelected, results: newResults, completedFiles: newCompleted });
  },

  renameFileInList: (oldPath, newPath, newName) => {
    const { files, selectedFiles, results, completedFiles } = get();
    // Update the file in the files array with new path and name
    const newFiles = files.map((f) => {
      if (f.path === oldPath) {
        return { ...f, path: newPath, name: newName };
      }
      return f;
    });
    // Remove from selected files (old path)
    const newSelected = new Set(selectedFiles);
    newSelected.delete(oldPath);
    // Remove from results (old path)
    const newResults = new Map(results);
    newResults.delete(oldPath);
    // Add to completed files (new path)
    const newCompleted = new Set(completedFiles);
    newCompleted.delete(oldPath);
    newCompleted.add(newPath);
    set({ files: newFiles, selectedFiles: newSelected, results: newResults, completedFiles: newCompleted });
  },

  selectFile: (path, selected) => {
    const { selectedFiles } = get();
    const newSelected = new Set(selectedFiles);
    if (selected) {
      newSelected.add(path);
    } else {
      newSelected.delete(path);
    }
    set({ selectedFiles: newSelected });
  },

  selectAll: (selected) => {
    const { files } = get();
    if (selected) {
      const supportedFiles = files.filter((f) => !f.isDirectory && f.isSupported);
      set({ selectedFiles: new Set(supportedFiles.map((f) => f.path)) });
    } else {
      set({ selectedFiles: new Set() });
    }
  },

  selectUnprocessed: (selected) => {
    const { files, results, completedFiles, selectedFiles } = get();
    const unprocessed = files.filter(
      (f) => !f.isDirectory && f.isSupported && !results.has(f.path) && !completedFiles.has(f.path)
    );
    
    const newSelected = new Set(selectedFiles);
    unprocessed.forEach((f) => {
      if (selected) {
        newSelected.add(f.path);
      } else {
        newSelected.delete(f.path);
      }
    });
    set({ selectedFiles: newSelected });
  },

  clearSelection: () => set({ selectedFiles: new Set() }),

  addResult: (path, result) => {
    const { results } = get();
    const newResults = new Map(results);
    // Preserve aiSuggestedName if it's a new result (first AI suggestion)
    const resultWithAiName = {
      ...result,
      aiSuggestedName: result.aiSuggestedName || result.suggestedName,
    };
    newResults.set(path, resultWithAiName);
    set({ results: newResults });
  },

  removeResult: (path) => {
    const { results } = get();
    const newResults = new Map(results);
    newResults.delete(path);
    set({ results: newResults });
  },

  updateResult: (path, updates) => {
    const { results } = get();
    const existing = results.get(path);
    if (existing) {
      const newResults = new Map(results);
      newResults.set(path, { ...existing, ...updates });
      set({ results: newResults });
    }
  },

  clearResults: () => set({ results: new Map() }),

  markComplete: (path) => {
    const { completedFiles, results } = get();
    const newCompleted = new Set(completedFiles);
    newCompleted.add(path);
    // Also remove from results
    const newResults = new Map(results);
    newResults.delete(path);
    set({ completedFiles: newCompleted, results: newResults });
  },

  unmarkComplete: (path) => {
    const { completedFiles } = get();
    const newCompleted = new Set(completedFiles);
    newCompleted.delete(path);
    set({ completedFiles: newCompleted });
  },

  setSortConfig: (config) => set({ sortConfig: config }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setError: (error) => set({ error }),
}));
