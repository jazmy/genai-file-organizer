'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Book, Settings, Activity, Home } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  children?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    title: 'Overview',
    href: '/docs',
    icon: <Home className="w-4 h-4" />,
  },
  {
    title: 'User Guide',
    href: '/docs/user',
    icon: <Book className="w-4 h-4" />,
    children: [
      { title: 'Getting Started', href: '/docs/user/getting-started' },
      { title: 'Interface Overview', href: '/docs/user/interface' },
      { title: 'File Browser', href: '/docs/user/file-browser' },
      { title: 'AI Processing', href: '/docs/user/ai-processing' },
      { title: 'File Types', href: '/docs/user/file-types' },
      { title: 'Settings', href: '/docs/user/settings' },
    ],
  },
  {
    title: 'Admin Guide',
    href: '/docs/admin',
    icon: <Settings className="w-4 h-4" />,
    children: [
      { title: 'Installation', href: '/docs/admin/installation' },
      { title: 'Configuration', href: '/docs/admin/configuration' },
      { title: 'CLI Reference', href: '/docs/admin/cli' },
      { title: 'API Reference', href: '/docs/admin/api' },
      { title: 'Troubleshooting', href: '/docs/admin/troubleshooting' },
    ],
  },
  {
    title: 'Logs & Evaluation',
    href: '/docs/logs',
    icon: <Activity className="w-4 h-4" />,
    children: [
      { title: 'Overview', href: '/docs/logs/overview' },
      { title: 'AI Logs', href: '/docs/logs/ai-logs' },
      { title: 'API Logs', href: '/docs/logs/api-logs' },
      { title: 'Effectiveness', href: '/docs/logs/effectiveness' },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/docs') {
      return pathname === '/docs';
    }
    return pathname.startsWith(href);
  };

  const isExactActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Documentation
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>GenOrganize v1.0</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <nav className="sticky top-24 space-y-1">
            {navigation.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
                {item.children && isActive(item.href) && (
                  <div className="ml-7 mt-1 space-y-1 border-l border-zinc-200 dark:border-zinc-700 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-3 py-1.5 text-sm rounded transition-colors',
                          isExactActive(child.href)
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                        )}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
