import Link from 'next/link';
import { ChevronRight, Rocket, Layout, FolderOpen, Cpu, FileText, Settings } from 'lucide-react';

export default function UserGuidePage() {
  const sections = [
    {
      title: 'Getting Started',
      href: '/docs/user/getting-started',
      icon: <Rocket className="w-6 h-6 text-green-500" />,
      description: 'Launch the app, understand the basics, and process your first files.',
    },
    {
      title: 'Interface Overview',
      href: '/docs/user/interface',
      icon: <Layout className="w-6 h-6 text-blue-500" />,
      description: 'Learn about the sidebar, header, file browser, and status bar.',
    },
    {
      title: 'File Browser',
      href: '/docs/user/file-browser',
      icon: <FolderOpen className="w-6 h-6 text-yellow-500" />,
      description: 'Navigate folders, select files, filter, sort, and perform bulk actions.',
    },
    {
      title: 'AI Processing',
      href: '/docs/user/ai-processing',
      icon: <Cpu className="w-6 h-6 text-purple-500" />,
      description: 'Generate AI-powered names, review suggestions, and apply changes.',
    },
    {
      title: 'File Types',
      href: '/docs/user/file-types',
      icon: <FileText className="w-6 h-6 text-orange-500" />,
      description: 'Customize file categories, prompts, and auto-organization rules.',
    },
    {
      title: 'Settings',
      href: '/docs/user/settings',
      icon: <Settings className="w-6 h-6 text-zinc-500" />,
      description: 'Configure Ollama, appearance, shortcuts, and general preferences.',
    },
  ];

  return (
    <div className="docs-content">
      <h1>User Guide</h1>
      <p className="lead">
        Welcome to GenOrganize! This comprehensive guide covers every feature of the application to help you organize and rename your files using AI.
      </p>

      <img
        src="/docs/main-interface.png"
        alt="GenOrganize Main Interface"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Chapters</h2>
      <div className="grid gap-4 not-prose">
        {sections.map((section, index) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white dark:bg-zinc-900">
              {section.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-400">Chapter {index + 1}</span>
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{section.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
          </Link>
        ))}
      </div>

      <h2>Quick Start</h2>
      <ol>
        <li>Start the API server: <code>npm run server</code></li>
        <li>Start the web UI: <code>npm run web</code></li>
        <li>Open your browser to <code>http://localhost:3000</code></li>
        <li>Navigate to a folder with files you want to organize</li>
        <li>Select files and click <strong>Generate</strong> to get AI suggestions</li>
        <li>Review the suggestions and click <strong>Apply</strong> to rename</li>
      </ol>

      <h2>Tips for Best Results</h2>
      <ul>
        <li><strong>Process similar files together</strong>: Batch photos from the same event, or invoices from the same vendor</li>
        <li><strong>Use filters</strong>: Filter by &quot;Unprocessed&quot; to focus on files that need attention</li>
        <li><strong>Review before applying</strong>: Always check suggested names before bulk applying</li>
        <li><strong>Add shortcuts</strong>: Configure folder shortcuts for your most-used directories</li>
      </ul>
    </div>
  );
}
