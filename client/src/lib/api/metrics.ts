import { fetchApi } from './client';

export interface ProcessingMetrics {
  total: number;
  succeeded: number;
  failed: number;
  successRate: number;
  avgProcessingTimeMs: number;
  p95ProcessingTimeMs: number;
}

export interface ApiMetrics {
  totalRequests: number;
  errors: number;
  errorRate: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
}

export interface QueueMetrics {
  pending: number;
  completed: number;
}

export interface SystemMetrics {
  uptimeMs: number;
  uptimeFormatted: string;
  lastActivity: number;
  startTime: number;
}

export interface MemoryMetrics {
  current: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
  };
  status: 'normal' | 'warning' | 'critical';
  threshold: {
    warn: number;
    critical: number;
  };
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    samples: number;
  };
}

export interface HourlyStat {
  timestamp: number;
  filesProcessed: number;
  filesSucceeded: number;
  filesFailed: number;
  apiRequests: number;
  apiErrors: number;
}

export interface MetricsResponse {
  success: boolean;
  processing: ProcessingMetrics;
  api: ApiMetrics;
  queue: QueueMetrics;
  system: SystemMetrics;
  memory: MemoryMetrics;
  hourlyStats: HourlyStat[];
}

export async function getMetrics(): Promise<MetricsResponse> {
  return fetchApi<MetricsResponse>('/api/system/metrics');
}

export async function resetMetrics(): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>('/api/system/metrics/reset', {
    method: 'POST',
  });
}
