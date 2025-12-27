import Link from 'next/link';
import { ChevronRight, Download, Settings, Terminal, Server, AlertTriangle } from 'lucide-react';

export default function AdminGuidePage() {
  const sections = [
    {
      title: 'Installation',
      href: '/docs/admin/installation',
      icon: <Download className="w-6 h-6 text-green-500" />,
      description: 'System requirements, installation steps, and Ollama setup.',
    },
    {
      title: 'Configuration',
      href: '/docs/admin/configuration',
      icon: <Settings className="w-6 h-6 text-blue-500" />,
      description: 'Environment variables, config files, and advanced settings.',
    },
    {
      title: 'CLI Reference',
      href: '/docs/admin/cli',
      icon: <Terminal className="w-6 h-6 text-purple-500" />,
      description: 'Command-line interface for batch processing and automation.',
    },
    {
      title: 'API Reference',
      href: '/docs/admin/api',
      icon: <Server className="w-6 h-6 text-orange-500" />,
      description: 'REST API endpoints, request/response formats, and examples.',
    },
    {
      title: 'Troubleshooting',
      href: '/docs/admin/troubleshooting',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
      description: 'Common issues, debugging tips, and solutions.',
    },
  ];

  return (
    <div className="docs-content">
      <h1>Admin Guide</h1>
      <p className="lead">
        This guide covers installation, configuration, and administration of GenAI File Organizer.
      </p>

      <img
        src="/docs/settings.png"
        alt="GenAI File Organizer Settings Page"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Chapters</h2>
      <div className="grid gap-4 not-prose">
        {sections.map((section, index) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-600 transition-colors"
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
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-green-500 transition-colors" />
          </Link>
        ))}
      </div>

      <h2>Quick Start for Admins</h2>
      <pre><code>{`# Clone and install
git clone <repository-url>
cd genorganize
npm run install:all

# Configure environment
cp server/.env.example server/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > client/.env.local

# Install Ollama and model
brew install ollama
ollama serve &
ollama pull qwen3-vl:8b

# Verify setup
npm run doctor

# Start services
npm run server &
npm run web`}</code></pre>

      <h2>System Overview</h2>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Port</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Web UI</strong></td>
            <td>3000</td>
            <td>Next.js frontend application</td>
          </tr>
          <tr>
            <td><strong>API Server</strong></td>
            <td>3001</td>
            <td>Express backend with REST API</td>
          </tr>
          <tr>
            <td><strong>Ollama</strong></td>
            <td>11434</td>
            <td>Local AI model server</td>
          </tr>
          <tr>
            <td><strong>Database</strong></td>
            <td>-</td>
            <td>SQLite (file-based)</td>
          </tr>
        </tbody>
      </table>

      <h2>Security Notes</h2>
      <ul>
        <li>All processing is <strong>100% local</strong> - no data leaves your machine</li>
        <li>Ollama runs entirely <strong>offline</strong></li>
        <li>No telemetry or analytics</li>
        <li>API server binds to <strong>localhost by default</strong></li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/admin/installation" className="text-blue-500 hover:underline">
            Installation
          </Link>{' '}
          - Detailed setup instructions
        </li>
        <li>
          <Link href="/docs/admin/configuration" className="text-blue-500 hover:underline">
            Configuration
          </Link>{' '}
          - Environment variables and options
        </li>
        <li>
          <Link href="/docs/admin/cli" className="text-blue-500 hover:underline">
            CLI Reference
          </Link>{' '}
          - Command-line usage
        </li>
      </ul>
    </div>
  );
}
