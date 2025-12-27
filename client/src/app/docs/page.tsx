import Link from 'next/link';
import { Book, Settings, Activity, ChevronRight, Zap, FileText, Terminal, BarChart3 } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="docs-content">
      <h1>GenAI File Organizer Documentation</h1>
      <p className="lead">
        Welcome to the GenAI File Organizer documentation. Choose a guide based on your needs.
      </p>

      <div className="grid md:grid-cols-2 gap-6 not-prose mt-8">
        <Link
          href="/docs/user"
          className="group p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <Book className="w-8 h-8 text-blue-500" />
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            User Guide
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Learn how to use GenAI File Organizer to organize and rename your files with AI.
          </p>
        </Link>

        <Link
          href="/docs/admin"
          className="group p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <Settings className="w-8 h-8 text-green-500" />
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-green-500 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Admin Guide
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Installation, configuration, and administration of GenAI File Organizer.
          </p>
        </Link>

        <Link
          href="/docs/logs"
          className="group p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors md:col-span-2"
        >
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8 text-purple-500" />
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Logs & Evaluation
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Monitor AI processing, review prompts and responses, track effectiveness, and improve accuracy over time.
          </p>
        </Link>
      </div>

      <h2>Quick Links</h2>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Guide</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Install GenAI File Organizer</td>
            <td><Link href="/docs/admin/installation" className="text-blue-500 hover:underline">Admin Guide &rarr; Installation</Link></td>
          </tr>
          <tr>
            <td>Configure settings</td>
            <td><Link href="/docs/admin/configuration" className="text-blue-500 hover:underline">Admin Guide &rarr; Configuration</Link></td>
          </tr>
          <tr>
            <td>Process files with AI</td>
            <td><Link href="/docs/user/ai-processing" className="text-blue-500 hover:underline">User Guide &rarr; AI Processing</Link></td>
          </tr>
          <tr>
            <td>Customize file types</td>
            <td><Link href="/docs/user/file-types" className="text-blue-500 hover:underline">User Guide &rarr; File Types</Link></td>
          </tr>
          <tr>
            <td>Use the CLI</td>
            <td><Link href="/docs/admin/cli" className="text-blue-500 hover:underline">Admin Guide &rarr; CLI Reference</Link></td>
          </tr>
          <tr>
            <td>Troubleshoot issues</td>
            <td><Link href="/docs/admin/troubleshooting" className="text-blue-500 hover:underline">Admin Guide &rarr; Troubleshooting</Link></td>
          </tr>
          <tr>
            <td>View AI logs & prompts</td>
            <td><Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">Logs &rarr; AI Logs</Link></td>
          </tr>
          <tr>
            <td>Track prompt effectiveness</td>
            <td><Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">Logs &rarr; Effectiveness</Link></td>
          </tr>
        </tbody>
      </table>

      <h2>Feature Highlights</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <div className="flex gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">AI-Powered Naming</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Vision AI analyzes images, documents, and code to generate meaningful filenames.</p>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">30+ File Types</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Pre-configured categories for invoices, screenshots, documents, code, and more.</p>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <Terminal className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">CLI & Web UI</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Use the graphical interface or command line for batch processing.</p>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <BarChart3 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Effectiveness Tracking</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Monitor and improve AI accuracy with detailed analytics.</p>
          </div>
        </div>
      </div>

      <h2>New Features</h2>
      <ul>
        <li><strong>Faster AI model support</strong> - Use <code>moondream</code> for 4x faster processing</li>
        <li><strong>Recently Moved Files</strong> - Track files that were auto-organized to different folders</li>
        <li><strong>Prompt versioning</strong> - Track changes to prompts, compare versions, rollback</li>
        <li><strong>Rate limiting</strong> - Prevent overwhelming the AI server with configurable limits</li>
        <li><strong>Memory management</strong> - Automatic cleanup and monitoring</li>
        <li><strong>Settings export/import</strong> - Backup and restore all settings</li>
        <li><strong>Parallel processing</strong> - Process multiple files simultaneously (configurable)</li>
        <li><strong>Comprehensive logging</strong> - AI logs, API logs, error tracking</li>
        <li><strong>User feedback analytics</strong> - Track acceptance rates by category</li>
        <li><strong>Extension preservation</strong> - Always keeps original file extension</li>
      </ul>

      <h2>Getting Help</h2>
      <ol>
        <li>Run <code>npm run doctor</code> to diagnose common issues</li>
        <li>Check the <Link href="/docs/admin/troubleshooting" className="text-blue-500 hover:underline">Troubleshooting</Link> section in the Admin Guide</li>
        <li>Review server logs for detailed error messages</li>
      </ol>
    </div>
  );
}
