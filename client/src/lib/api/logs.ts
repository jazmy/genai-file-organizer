import { fetchApi } from './client';
import type {
  AILog,
  APILog,
  ErrorLog,
  PaginatedResponse,
  LogStats,
  CategoryEffectiveness,
  RecentRejection,
  AILogFilters,
  APILogFilters,
  ErrorLogFilters,
  FeedbackPayload,
  TimeRange,
  FeedbackDetailsResponse,
  FeedbackActionType,
} from '@/types/logs';

// Build query string from filters
function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
}

// AI Logs
export async function getAILogs(
  filters: AILogFilters = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<AILog>> {
  const query = buildQueryString({ ...filters, page, limit });
  return fetchApi<PaginatedResponse<AILog>>(`/api/logs/ai${query}`);
}

export async function getAILogById(requestId: string): Promise<{ success: boolean; log: AILog }> {
  return fetchApi<{ success: boolean; log: AILog }>(`/api/logs/ai/${requestId}`);
}

// API Logs
export async function getAPILogs(
  filters: APILogFilters = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<APILog>> {
  const query = buildQueryString({ ...filters, page, limit });
  return fetchApi<PaginatedResponse<APILog>>(`/api/logs/api${query}`);
}

// Error Logs
export async function getErrorLogs(
  filters: ErrorLogFilters = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<ErrorLog>> {
  const query = buildQueryString({
    type: filters.errorType,
    resolved: filters.resolved,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page,
    limit,
  });
  return fetchApi<PaginatedResponse<ErrorLog>>(`/api/logs/errors${query}`);
}

export async function resolveError(
  errorId: string,
  resolutionNotes: string
): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(`/api/logs/errors/${errorId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify({ resolutionNotes }),
  });
}

// Statistics
export async function getLogStats(timeRange: TimeRange = 'all'): Promise<{ success: boolean; stats: LogStats }> {
  return fetchApi<{ success: boolean; stats: LogStats }>(`/api/logs/stats?timeRange=${timeRange}`);
}

// Effectiveness
export async function getPromptEffectiveness(
  timeRange: TimeRange = 'all'
): Promise<{ success: boolean; effectiveness: CategoryEffectiveness[] }> {
  return fetchApi<{ success: boolean; effectiveness: CategoryEffectiveness[] }>(
    `/api/logs/effectiveness?timeRange=${timeRange}`
  );
}

export async function getLowPerformingCategories(
  threshold = 50,
  timeRange: TimeRange = 'all'
): Promise<{ success: boolean; lowPerforming: CategoryEffectiveness[] }> {
  return fetchApi<{ success: boolean; lowPerforming: CategoryEffectiveness[] }>(
    `/api/logs/effectiveness/alerts?threshold=${threshold}&timeRange=${timeRange}`
  );
}

export async function getRecentRejections(
  limit = 10,
  timeRange: TimeRange = 'all'
): Promise<{ success: boolean; rejections: RecentRejection[] }> {
  return fetchApi<{ success: boolean; rejections: RecentRejection[] }>(`/api/logs/rejections?limit=${limit}&timeRange=${timeRange}`);
}

// Feedback
export async function recordFeedback(
  payload: FeedbackPayload
): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>('/api/logs/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Get feedback details by action type
export async function getFeedbackDetails(
  actionType: FeedbackActionType,
  timeRange: TimeRange = 'all',
  page = 1,
  limit = 50
): Promise<FeedbackDetailsResponse> {
  const query = buildQueryString({ timeRange, page, limit });
  return fetchApi<FeedbackDetailsResponse>(`/api/logs/feedback/${actionType}${query}`);
}

// Cleanup
export async function cleanupOldLogs(
  olderThanDays = 30
): Promise<{ success: boolean; aiLogsDeleted: number; apiLogsDeleted: number; errorLogsDeleted: number }> {
  return fetchApi<{
    success: boolean;
    aiLogsDeleted: number;
    apiLogsDeleted: number;
    errorLogsDeleted: number;
  }>(`/api/logs/cleanup?olderThan=${olderThanDays}`, { method: 'DELETE' });
}

// Clear all logs
export async function clearAllLogs(): Promise<{
  success: boolean;
  aiLogsDeleted: number;
  apiLogsDeleted: number;
  errorLogsDeleted: number;
}> {
  return fetchApi('/api/logs/clear-all', { method: 'DELETE' });
}
