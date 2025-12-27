'use client';

import { useState } from 'react';
import { Search, RefreshCw, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { TimeRange } from '@/types/logs';

interface LogFiltersProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  showSearch?: boolean;
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

// Format datetime-local input value
function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Get default dates (past hour)
function getDefaultDates(): { start: string; end: string } {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  return {
    start: formatDateTimeLocal(oneHourAgo),
    end: formatDateTimeLocal(now),
  };
}

export function LogFilters({
  timeRange,
  onTimeRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  search,
  onSearchChange,
  onRefresh,
  refreshing,
  showSearch = true,
}: LogFiltersProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(customStartDate || defaults.start);
  const [endDate, setEndDate] = useState(customEndDate || defaults.end);

  const handleTimeRangeChange = (range: TimeRange) => {
    if (range === 'custom') {
      setShowCustomPicker(true);
      // Set default dates if not already set
      if (!customStartDate || !customEndDate) {
        const defaults = getDefaultDates();
        setStartDate(defaults.start);
        setEndDate(defaults.end);
      }
    } else {
      setShowCustomPicker(false);
    }
    onTimeRangeChange(range);
  };

  const handleApplyCustomRange = () => {
    if (onCustomDateChange && startDate && endDate) {
      onCustomDateChange(startDate, endDate);
    }
    setShowCustomPicker(false);
  };

  const handleClearCustomRange = () => {
    const defaults = getDefaultDates();
    setStartDate(defaults.start);
    setEndDate(defaults.end);
    onTimeRangeChange('1h');
    setShowCustomPicker(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {showSearch && onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search logs..."
              className="pl-10"
            />
          </div>
        )}

        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTimeRangeChange(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === option.value
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {option.value === 'custom' && <Calendar className="w-3 h-3 inline mr-1" />}
              {option.label}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Custom date range picker */}
      {(timeRange === 'custom' || showCustomPicker) && onCustomDateChange && (
        <div className="flex flex-wrap items-end gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApplyCustomRange}>
              Apply
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearCustomRange}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
