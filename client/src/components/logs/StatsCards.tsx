'use client';

import { Activity, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import type { LogStats } from '@/types/logs';

interface StatsCardsProps {
  stats: LogStats | null;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse">
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
            <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const aiTotal = stats.ai.total ?? 0;
  const aiSuccessful = stats.ai.successful ?? 0;
  const errorsUnresolved = stats.errors.unresolved ?? 0;

  const successRate = aiTotal > 0
    ? ((aiSuccessful / aiTotal) * 100).toFixed(1)
    : '0';

  const avgTime = stats.ai.avgResponseTime
    ? (stats.ai.avgResponseTime / 1000).toFixed(1)
    : '0';

  const cards = [
    {
      label: 'Total Requests',
      value: aiTotal.toLocaleString(),
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Avg Response',
      value: `${avgTime}s`,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Errors Today',
      value: errorsUnresolved.toString(),
      icon: AlertTriangle,
      color: errorsUnresolved > 0 ? 'text-red-500' : 'text-zinc-400',
      bgColor: errorsUnresolved > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-zinc-50 dark:bg-zinc-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">{card.label}</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
