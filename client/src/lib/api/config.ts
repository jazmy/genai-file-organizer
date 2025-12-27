import { fetchApi } from './client';
import type { ConfigResponse } from '@/types/api';

export async function getConfig(): Promise<ConfigResponse> {
  return fetchApi<ConfigResponse>('/api/config');
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidateConfigResponse {
  success: boolean;
  valid?: boolean;
  errors?: ValidationError[];
  data?: ConfigResponse;
}

export async function validateConfig(config: Partial<ConfigResponse>): Promise<ValidateConfigResponse> {
  return fetchApi<ValidateConfigResponse>('/api/config/validate', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function saveConfig(config: ConfigResponse): Promise<{ success: boolean; validationErrors?: ValidationError[] }> {
  return fetchApi<{ success: boolean; validationErrors?: ValidationError[] }>('/api/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function getOllamaStatus(): Promise<{
  success: boolean;
  models?: Array<{ name: string }>;
  error?: string;
}> {
  return fetchApi('/api/ollama/status');
}

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  return fetchApi('/api/health');
}

// Prompts API
export interface PromptData {
  id: number;
  category: string;
  prompt: string;
  description: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export async function getAllPrompts(): Promise<{ success: boolean; prompts: PromptData[] }> {
  return fetchApi('/api/prompts');
}

export async function getPromptByCategory(category: string): Promise<{ success: boolean; prompt: PromptData }> {
  return fetchApi(`/api/prompts/${category}`);
}

export async function updatePrompt(category: string, prompt: string, description?: string): Promise<{ success: boolean }> {
  return fetchApi(`/api/prompts/${category}`, {
    method: 'PUT',
    body: JSON.stringify({ prompt, description }),
  });
}

export async function resetPromptToDefault(category: string): Promise<{ success: boolean }> {
  return fetchApi(`/api/prompts/${category}/reset`, {
    method: 'POST',
  });
}

export async function createFileType(category: string, prompt: string, description?: string, folderDestination?: string): Promise<{ success: boolean; category?: string; error?: string }> {
  return fetchApi('/api/prompts', {
    method: 'POST',
    body: JSON.stringify({ category, prompt, description, folderDestination }),
  });
}

export async function deleteFileType(category: string): Promise<{ success: boolean; error?: string }> {
  return fetchApi(`/api/prompts/${category}`, {
    method: 'DELETE',
  });
}

// Export/Import settings
export interface ExportedPrompt {
  category: string;
  prompt: string;
  description: string | null;
  isDefault: boolean;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  config: ConfigResponse;
  prompts: ExportedPrompt[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  results: {
    config: boolean;
    prompts: { updated: number; failed: number };
  };
  errors?: Array<{ type: string; category?: string; error?: string; errors?: ValidationError[] }>;
}

export async function exportSettings(): Promise<ExportData> {
  return fetchApi<ExportData>('/api/config/export');
}

export async function importSettings(data: ExportData): Promise<ImportResult> {
  return fetchApi<ImportResult>('/api/config/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Helper to download export as file
export function downloadExportAsFile(data: ExportData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `genorganize-settings-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset all data (logs, queues, processed files) - keeps settings and prompts
export interface ResetDataResult {
  success: boolean;
  message: string;
  deleted: Record<string, number | { error: string }>;
}

export async function resetAllData(): Promise<ResetDataResult> {
  return fetchApi<ResetDataResult>('/api/system/reset-data', {
    method: 'POST',
  });
}
