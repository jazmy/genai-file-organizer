export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ListFilesResponse {
  path: string;
  items: import('./files').FileItem[];
}

export interface ProcessingStatus {
  isProcessing: boolean;
  current: number;
  total: number;
  batchId?: string;
  hasPendingQueue?: boolean;
}

export interface PendingQueueResponse {
  hasPending: boolean;
  files: string[];
  batchId?: string;
  total: number;
  completed: number;
}

export interface FolderShortcut {
  name: string;
  path: string;
}

export interface FolderRule {
  type: string;
  destination: string;
}

export interface ConfigResponse {
  provider?: {
    type?: 'ollama' | 'llama-server';
  };
  ui?: {
    defaultPath?: string;
    theme?: 'light' | 'dark';
    folderShortcuts?: FolderShortcut[];
  };
  ollama?: {
    host?: string;
    model?: string;
    categorizationModel?: string;
    namingModel?: string;
    regenerationModel?: string;
  };
  llamaServer?: {
    host?: string;
    parallelSlots?: number;
    timeout?: number;
  };
  folders?: {
    enabled?: boolean;
    createIfMissing?: boolean;
    rules?: FolderRule[];
  };
  processing?: {
    parallelFiles?: number;
    enableValidation?: boolean;
    validationRetryCount?: number;
  };
}
