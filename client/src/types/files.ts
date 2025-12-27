export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isSupported: boolean;
  size: number;
  sizeKB: number;
  modified: string;
}

export interface ProcessResult {
  success: boolean;
  filePath: string;
  originalName: string;
  suggestedName: string;
  aiSuggestedName?: string; // Original AI suggestion (before any user edits)
  category: string;
  extension: string;
  processingTime: number;
  error?: string;
  dryRun?: boolean;
  skipped?: boolean;
  newPath?: string;
  // Validation loop metadata
  validationAttempts?: number;
  validationFailed?: boolean;
  validationReason?: string;
}

export interface FolderTreeNode {
  name: string;
  path: string;
  children?: FolderTreeNode[];
  isExpanded?: boolean;
}

export type SortField = 'name' | 'size' | 'modified' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export type ViewMode = 'grid' | 'list';
