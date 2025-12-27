import Link from 'next/link';
import { ChevronRight, Activity, FileSearch, Server, BarChart3 } from 'lucide-react';

export default function LogsGuidePage() {
  const sections = [
    {
      title: 'Overview',
      href: '/docs/logs/overview',
      icon: <Activity className="w-6 h-6 text-purple-500" />,
      description: 'Understanding the logging system and dashboard metrics.',
    },
    {
      title: 'AI Logs',
      href: '/docs/logs/ai-logs',
      icon: <FileSearch className="w-6 h-6 text-blue-500" />,
      description: 'View AI processing logs, prompts, responses, and debugging info.',
    },
    {
      title: 'API Logs',
      href: '/docs/logs/api-logs',
      icon: <Server className="w-6 h-6 text-green-500" />,
      description: 'Monitor HTTP requests, response times, and error rates.',
    },
    {
      title: 'Effectiveness',
      href: '/docs/logs/effectiveness',
      icon: <BarChart3 className="w-6 h-6 text-orange-500" />,
      description: 'Track acceptance rates, identify issues, and improve prompts.',
    },
  ];

  return (
    <div className="docs-content">
      <h1>Logs & Evaluation</h1>
      <p className="lead">
        Monitor AI processing, review prompts and responses, track effectiveness metrics, and continuously improve file naming accuracy.
      </p>

      <h2>Sections</h2>
      <div className="grid gap-4 not-prose">
        {sections.map((section, index) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white dark:bg-zinc-900">
              {section.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-400">Section {index + 1}</span>
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{section.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 transition-colors" />
          </Link>
        ))}
      </div>

      <h2>Why Use Logs & Evaluation?</h2>
      <p>The logging system provides complete transparency into how GenAI File Organizer processes your files:</p>
      <ul>
        <li><strong>Debug issues</strong>: See exactly what the AI received and how it responded</li>
        <li><strong>Track performance</strong>: Monitor response times and success rates</li>
        <li><strong>Measure effectiveness</strong>: See acceptance rates per category</li>
        <li><strong>Improve prompts</strong>: Identify underperforming categories and refine their prompts</li>
        <li><strong>Audit changes</strong>: Review all API calls and file operations</li>
      </ul>

      <h2>Accessing Logs</h2>
      <p>Open the Logs & Evaluation page in two ways:</p>
      <ol>
        <li>Click <strong>&quot;Logs & Evaluation&quot;</strong> in the sidebar</li>
        <li>Navigate directly to <code>/logs</code> in your browser</li>
      </ol>

      <h2>Key Metrics at a Glance</h2>
      <img
        src="/docs/logs-overview.png"
        alt="Logs Page Overview"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total Requests</strong></td>
            <td>Number of files processed by AI</td>
          </tr>
          <tr>
            <td><strong>Success Rate</strong></td>
            <td>Percentage of processing completed without errors</td>
          </tr>
          <tr>
            <td><strong>Avg Response</strong></td>
            <td>Average time for AI to categorize and name a file</td>
          </tr>
          <tr>
            <td><strong>Errors Today</strong></td>
            <td>Number of unresolved errors in the current day</td>
          </tr>
        </tbody>
      </table>

      <h2>Quick Actions</h2>
      <ul>
        <li><strong>Filter by time</strong>: Use time range buttons (24h, 7d, 30d, All)</li>
        <li><strong>Search logs</strong>: Filter by filename or category</li>
        <li><strong>View details</strong>: Click any log entry to see full AI prompts and responses</li>
        <li><strong>Track effectiveness</strong>: Use the Effectiveness tab to find categories that need improvement</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/logs/overview" className="text-blue-500 hover:underline">
            Overview
          </Link>{' '}
          - Understand the logging system
        </li>
        <li>
          <Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">
            AI Logs
          </Link>{' '}
          - Debug AI processing
        </li>
        <li>
          <Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">
            Effectiveness
          </Link>{' '}
          - Improve naming accuracy
        </li>
      </ul>
    </div>
  );
}
