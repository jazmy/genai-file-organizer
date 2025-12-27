import { fetchApi, API_BASE } from './client';
import type { ProcessResult } from '@/types/files';
import type { ListFilesResponse } from '@/types/api';

export async function listFiles(path: string = '/'): Promise<ListFilesResponse> {
  return fetchApi<ListFilesResponse>(`/api/files?path=${encodeURIComponent(path)}`);
}

export interface RegenerationOptions {
  isRegeneration?: boolean;
  feedback?: string;
  rejectedName?: string;
}

export async function processFile(
  filePath: string,
  dryRun: boolean = true,
  autoMove: boolean = false,
  regenerationOptions?: RegenerationOptions
): Promise<ProcessResult> {
  return fetchApi<ProcessResult>('/api/process/file', {
    method: 'POST',
    body: JSON.stringify({
      filePath,
      dryRun,
      autoMove,
      ...regenerationOptions,
    }),
  });
}

export async function applyChanges(
  changes: Array<{ filePath: string; suggestedName: string }>
): Promise<{ success: boolean; results: ProcessResult[] }> {
  return fetchApi('/api/apply', {
    method: 'POST',
    body: JSON.stringify({ files: changes }),
  });
}

export async function deleteFile(filePath: string): Promise<{ success: boolean }> {
  return fetchApi('/api/file/delete', {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  });
}

export async function moveFile(
  sourcePath: string,
  destinationPath: string
): Promise<{ success: boolean }> {
  return fetchApi('/api/file/move', {
    method: 'POST',
    body: JSON.stringify({ sourcePath, destinationPath }),
  });
}

export function getFilePreviewUrl(filePath: string): string {
  return `${API_BASE}/api/file/preview?path=${encodeURIComponent(filePath)}`;
}

export async function getCachedByDirectory(
  dirPath: string
): Promise<{ pending: Array<any>; applied: Array<any> }> {
  return fetchApi(`/api/db/by-directory?path=${encodeURIComponent(dirPath)}`);
}

export interface PendingFile {
  id: number;
  original_path: string;
  original_name: string;
  suggested_name: string;
  ai_suggested_name?: string;
  category: string;
  status: string;
  error?: string;
  created_at: string;
}

export async function getAllPendingFiles(): Promise<{ files: PendingFile[] }> {
  return fetchApi('/api/db/pending');
}

export async function clearAppliedFiles(filePaths: string[]): Promise<{ success: boolean }> {
  return fetchApi('/api/db/clear-applied', {
    method: 'POST',
    body: JSON.stringify({ filePaths }),
  });
}

export async function markFilesAsSkipped(filePaths: string[]): Promise<{ success: boolean; count: number }> {
  return fetchApi('/api/db/mark-skipped', {
    method: 'POST',
    body: JSON.stringify({ filePaths }),
  });
}

export async function updateSuggestedName(filePath: string, suggestedName: string): Promise<{ success: boolean }> {
  return fetchApi('/api/db/update-suggested-name', {
    method: 'POST',
    body: JSON.stringify({ filePath, suggestedName }),
  });
}
