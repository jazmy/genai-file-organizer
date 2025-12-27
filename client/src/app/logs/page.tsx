'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Activity, Server, AlertTriangle, TrendingUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import {
  StatsCards,
  LogFilters,
  AILogTable,
  APILogTable,
  ErrorLogTable,
  LogDetailModal,
  EffectivenessTab,
} from '@/components/logs';
import { getAILogs, getAPILogs, getErrorLogs, getLogStats, clearAllLogs } from '@/lib/api/logs';
import { useUIStore } from '@/stores/uiStore';
import type { AILog, APILog, ErrorLog, LogStats, TimeRange, AILogFilters } from '@/types/logs';

type TabType = 'ai' | 'api' | 'errors' | 'effectiveness';

// Wrapper component to handle Suspense for useSearchParams
function LogsPageContent() {
  const searchParams = useSearchParams();
  const openFileHandled = useRef(false);

  // State
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<LogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { addToast } = useUIStore();

  // Handle URL parameters on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const searchParam = searchParams.get('search');
    const openFileParam = searchParams.get('openFile');

    if (tabParam && ['ai', 'api', 'errors', 'effectiveness'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
    if (searchParam) {
      setSearch(searchParam);
    }
    // Track if we need to auto-open a file's log
    if (openFileParam) {
      openFileHandled.current = false;
    }
  }, [searchParams]);

  // AI logs state
  const [aiLogs, setAILogs] = useState<AILog[]>([]);
  const [aiLogsTotal, setAILogsTotal] = useState(0);
  const [aiLogsPage, setAILogsPage] = useState(1);
  const [aiLogsTotalPages, setAILogsTotalPages] = useState(1);
  const [aiLogsLoading, setAILogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AILog | null>(null);

  // API logs state
  const [apiLogs, setAPILogs] = useState<APILog[]>([]);
  const [apiLogsTotal, setAPILogsTotal] = useState(0);
  const [apiLogsPage, setAPILogsPage] = useState(1);
  const [apiLogsTotalPages, setAPILogsTotalPages] = useState(1);
  const [apiLogsLoading, setAPILogsLoading] = useState(false);

  // Error logs state
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [errorLogsTotal, setErrorLogsTotal] = useState(0);
  const [errorLogsPage, setErrorLogsPage] = useState(1);
  const [errorLogsTotalPages, setErrorLogsTotalPages] = useState(1);
  const [errorLogsLoading, setErrorLogsLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await getLogStats(timeRange);
      setStats(result.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [timeRange]);

  // Helper to get date filter based on time range
  const getDateFilter = useCallback(() => {
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate).toISOString(),
      };
    }
    if (timeRange === 'all') {
      return {};
    }
    const now = new Date();
    const startDate = new Date();
    if (timeRange === '1h') startDate.setHours(now.getHours() - 1);
    else if (timeRange === '24h') startDate.setDate(now.getDate() - 1);
    else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
    return { startDate: startDate.toISOString() };
  }, [timeRange, customStartDate, customEndDate]);

  // Load AI logs
  const loadAILogs = useCallback(async (page = 1) => {
    setAILogsLoading(true);
    try {
      const dateFilter = getDateFilter();
      const filters: AILogFilters = { search: search || undefined, ...dateFilter };

      const result = await getAILogs(filters, page, 20);
      setAILogs(result.logs);
      setAILogsTotal(result.total);
      setAILogsPage(result.page);
      setAILogsTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to load AI logs:', error);
    } finally {
      setAILogsLoading(false);
    }
  }, [search, getDateFilter]);

  // Load API logs
  const loadAPILogs = useCallback(async (page = 1) => {
    setAPILogsLoading(true);
    try {
      const dateFilter = getDateFilter();
      const result = await getAPILogs(dateFilter, page, 20);
      setAPILogs(result.logs);
      setAPILogsTotal(result.total);
      setAPILogsPage(result.page);
      setAPILogsTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to load API logs:', error);
    } finally {
      setAPILogsLoading(false);
    }
  }, [getDateFilter]);

  // Load error logs
  const loadErrorLogs = useCallback(async (page = 1) => {
    setErrorLogsLoading(true);
    try {
      const dateFilter = getDateFilter();
      const result = await getErrorLogs(dateFilter, page, 20);
      setErrorLogs(result.logs);
      setErrorLogsTotal(result.total);
      setErrorLogsPage(result.page);
      setErrorLogsTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to load error logs:', error);
    } finally {
      setErrorLogsLoading(false);
    }
  }, [getDateFilter]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'ai') {
      loadAILogs(1);
    } else if (activeTab === 'api') {
      loadAPILogs(1);
    } else if (activeTab === 'errors') {
      loadErrorLogs(1);
    }
  }, [activeTab, timeRange, customStartDate, customEndDate, loadAILogs, loadAPILogs, loadErrorLogs]);

  // Debounced search for AI logs
  useEffect(() => {
    if (activeTab === 'ai') {
      const timer = setTimeout(() => {
        loadAILogs(1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search]);

  // Auto-open log detail modal when openFile param is present
  useEffect(() => {
    const openFileParam = searchParams.get('openFile');
    if (openFileParam && aiLogs.length > 0 && !openFileHandled.current && !aiLogsLoading) {
      // Find the first log matching the filename
      const matchingLog = aiLogs.find(log =>
        log.file_name === openFileParam ||
        log.file_path?.includes(openFileParam)
      );
      if (matchingLog) {
        setSelectedLog(matchingLog);
        openFileHandled.current = true;
      }
    }
  }, [aiLogs, aiLogsLoading, searchParams]);

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const handleClearAllLogs = async () => {
    setClearing(true);
    try {
      const result = await clearAllLogs();
      const totalDeleted = result.aiLogsDeleted + result.apiLogsDeleted + result.errorLogsDeleted;
      addToast({
        type: 'success',
        title: 'Logs Cleared',
        message: `Deleted ${totalDeleted} log entries`,
      });
      // Refresh all data
      await handleRefresh();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to clear logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadStats(),
      activeTab === 'ai' ? loadAILogs(aiLogsPage) : Promise.resolve(),
      activeTab === 'api' ? loadAPILogs(apiLogsPage) : Promise.resolve(),
      activeTab === 'errors' ? loadErrorLogs(errorLogsPage) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const tabs = [
    { id: 'ai' as const, label: 'AI Logs', icon: Activity, count: stats?.ai.total },
    { id: 'api' as const, label: 'API Logs', icon: Server, count: stats?.api.total },
    { id: 'errors' as const, label: 'Errors', icon: AlertTriangle, count: stats?.errors.unresolved },
    { id: 'effectiveness' as const, label: 'Effectiveness', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Logs & Evaluation
                </h1>
                <p className="text-sm text-zinc-500">
                  Monitor AI processing, API calls, and prompt effectiveness
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Logs
            </Button>
          </div>
        </div>
      </header>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowClearConfirm(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Clear All Logs?
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              This will permanently delete all AI logs, API logs, and error logs. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleClearAllLogs}
                disabled={clearing}
                className="bg-red-600 hover:bg-red-700"
              >
                {clearing ? 'Clearing...' : 'Clear All'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-6">
          <StatsCards stats={stats} loading={statsLoading} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <LogFilters
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={handleCustomDateChange}
            search={activeTab === 'ai' ? search : undefined}
            onSearchChange={activeTab === 'ai' ? setSearch : undefined}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            showSearch={activeTab === 'ai'}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count != null && (
                <span className={cn(
                  'px-1.5 py-0.5 text-xs rounded-full',
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                )}>
                  {tab.count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'ai' && (
          <AILogTable
            logs={aiLogs}
            total={aiLogsTotal}
            page={aiLogsPage}
            limit={20}
            totalPages={aiLogsTotalPages}
            loading={aiLogsLoading}
            onPageChange={loadAILogs}
            onViewDetails={setSelectedLog}
          />
        )}

        {activeTab === 'api' && (
          <APILogTable
            logs={apiLogs}
            total={apiLogsTotal}
            page={apiLogsPage}
            limit={20}
            totalPages={apiLogsTotalPages}
            loading={apiLogsLoading}
            onPageChange={loadAPILogs}
          />
        )}

        {activeTab === 'errors' && (
          <ErrorLogTable
            logs={errorLogs}
            total={errorLogsTotal}
            page={errorLogsPage}
            limit={20}
            totalPages={errorLogsTotalPages}
            loading={errorLogsLoading}
            onPageChange={loadErrorLogs}
            onRefresh={() => loadErrorLogs(errorLogsPage)}
          />
        )}

        {activeTab === 'effectiveness' && (
          <EffectivenessTab timeRange={timeRange} />
        )}
      </main>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

// Export with Suspense wrapper for useSearchParams
export default function LogsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LogsPageContent />
    </Suspense>
  );
}
