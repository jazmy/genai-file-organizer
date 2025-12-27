import { fetchApi } from './client';
import type { ProcessingStatus, PendingQueueResponse } from '@/types/api';

export async function getProcessingStatus(): Promise<ProcessingStatus> {
  return fetchApi<ProcessingStatus>('/api/process/status');
}

export async function getActiveProcessingFiles(): Promise<{ files: string[] }> {
  return fetchApi<{ files: string[] }>('/api/process/active');
}

export async function startBatchProcessing(
  total: number,
  directory: string
): Promise<ProcessingStatus> {
  return fetchApi<ProcessingStatus>('/api/process/batch-start', {
    method: 'POST',
    body: JSON.stringify({ total, directory }),
  });
}

export async function endBatchProcessing(): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>('/api/process/batch-end', {
    method: 'POST',
  });
}

export async function createQueue(
  filePaths: string[],
  directory: string
): Promise<{ success: boolean; batchId: string; count: number }> {
  return fetchApi('/api/queue/create', {
    method: 'POST',
    body: JSON.stringify({ filePaths, directory }),
  });
}

export async function getPendingQueue(): Promise<PendingQueueResponse> {
  return fetchApi<PendingQueueResponse>('/api/queue/pending');
}

export async function markQueueJobComplete(
  batchId: string,
  filePath: string
): Promise<{ success: boolean }> {
  return fetchApi('/api/queue/complete', {
    method: 'POST',
    body: JSON.stringify({ batchId, filePath }),
  });
}

export async function markQueueJobFailed(
  batchId: string,
  filePath: string,
  error: string
): Promise<{ success: boolean }> {
  return fetchApi('/api/queue/fail', {
    method: 'POST',
    body: JSON.stringify({ batchId, filePath, error }),
  });
}

export async function clearPendingQueue(): Promise<{ success: boolean }> {
  return fetchApi('/api/queue/clear', {
    method: 'POST',
  });
}
