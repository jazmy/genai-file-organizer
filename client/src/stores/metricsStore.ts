import { create } from 'zustand';
import { getMetrics, resetMetrics, type MetricsResponse } from '@/lib/api/metrics';

interface MetricsState {
  metrics: MetricsResponse | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  autoRefresh: boolean;
  refreshInterval: number;

  fetchMetrics: () => Promise<void>;
  resetAllMetrics: () => Promise<void>;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (intervalMs: number) => void;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  metrics: null,
  loading: false,
  error: null,
  lastFetched: null,
  autoRefresh: false,
  refreshInterval: 5000,

  fetchMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const metrics = await getMetrics();
      set({
        metrics,
        loading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
      });
    }
  },

  resetAllMetrics: async () => {
    try {
      await resetMetrics();
      await get().fetchMetrics();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reset metrics',
      });
    }
  },

  setAutoRefresh: (enabled: boolean) => {
    set({ autoRefresh: enabled });
  },

  setRefreshInterval: (intervalMs: number) => {
    set({ refreshInterval: intervalMs });
  },
}));
