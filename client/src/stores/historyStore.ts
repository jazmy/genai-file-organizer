import { create } from 'zustand';

export type ActionType =
  | 'rename'        // Single file rename
  | 'batch_rename'  // Multiple files renamed at once
  | 'keep_original' // File kept with original name
  | 'delete'        // File deleted (can't undo from trash)
  | 'edit_name';    // Suggested name edited

interface FileAction {
  type: ActionType;
  timestamp: number;
  description: string;
  // For renames
  originalPath?: string;
  newPath?: string;
  // For batch operations
  files?: Array<{
    originalPath: string;
    newPath?: string;
    originalName: string;
    newName?: string;
  }>;
  // For edits
  previousValue?: string;
  newValue?: string;
}

interface HistoryState {
  // Undo/redo stacks
  undoStack: FileAction[];
  redoStack: FileAction[];
  maxHistorySize: number;

  // Actions
  pushAction: (action: Omit<FileAction, 'timestamp'>) => void;
  undo: () => FileAction | null;
  redo: () => FileAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getHistory: () => FileAction[];
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,

  pushAction: (action) => {
    const { undoStack, maxHistorySize } = get();
    const newAction: FileAction = {
      ...action,
      timestamp: Date.now(),
    };

    // Add to undo stack and clear redo stack
    const newUndoStack = [...undoStack, newAction];
    // Trim if over max size
    if (newUndoStack.length > maxHistorySize) {
      newUndoStack.shift();
    }

    set({
      undoStack: newUndoStack,
      redoStack: [], // Clear redo on new action
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;

    const action = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newRedoStack = [...redoStack, action];

    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });

    return action;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;

    const action = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newUndoStack = [...undoStack, action];

    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });

    return action;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  getHistory: () => get().undoStack,
}));

export default useHistoryStore;
