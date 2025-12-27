'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Home,
  Settings,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  Activity,
  CheckCircle,
  BookOpen,
  History,
  FolderTree,
  BarChart2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { API_BASE } from '@/lib/api/client';

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  isExpanded: boolean;
  isLoading: boolean;
}

interface FolderShortcut {
  name: string;
  path: string;
}

interface SidebarProps {
  showHistory?: boolean;
  onToggleHistory?: () => void;
  showPerformance?: boolean;
  onTogglePerformance?: () => void;
  showFolderTree?: boolean;
  onToggleFolderTree?: () => void;
}

export function Sidebar({
  showHistory,
  onToggleHistory,
  showPerformance,
  onTogglePerformance,
  showFolderTree,
  onToggleFolderTree,
}: SidebarProps) {
  const { theme, toggleTheme, sidebarOpen, toggleSidebar } = useUIStore();
  const { currentPath, setPath, loadFiles } = useFileStore();
  const [_folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [homePath, setHomePath] = useState('/');
  const [folderShortcuts, setFolderShortcuts] = useState<FolderShortcut[]>([]);

  // Initialize with home directory and load shortcuts
  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/config`);
      const config = await response.json();
      const defaultPath = config.ui?.defaultPath || '/';
      setHomePath(defaultPath);
      setFolderShortcuts(config.ui?.folderShortcuts || []);
      
      // Initialize folder tree with home
      setFolderTree([
        {
          name: defaultPath.split('/').pop() || 'Home',
          path: defaultPath,
          children: [],
          isExpanded: true,
          isLoading: false,
        },
      ]);
    } catch {
      setHomePath('/');
    }
  };

  useEffect(() => {
    loadConfig();
    
    // Listen for config changes (when settings are saved)
    const handleConfigChange = () => loadConfig();
    window.addEventListener('config-updated', handleConfigChange);
    return () => window.removeEventListener('config-updated', handleConfigChange);
  }, []);

  const handleNavigate = async (path: string) => {
    setPath(path);
    await loadFiles(path);
  };

  const toggleFolder = async (node: FolderNode) => {
    if (!node.isExpanded && node.children.length === 0) {
      // Load children
      try {
        const response = await fetch(
          `${API_BASE}/api/files?path=${encodeURIComponent(node.path)}`
        );
        const data = await response.json();
        const folders = data.items
          .filter((item: { isDirectory: boolean }) => item.isDirectory)
          .map((folder: { name: string; path: string }) => ({
            name: folder.name,
            path: folder.path,
            children: [],
            isExpanded: false,
            isLoading: false,
          }));

        // Update tree
        setFolderTree((prev) => updateNodeChildren(prev, node.path, folders));
      } catch (err) {
        console.error('Failed to load folders:', err);
      }
    }

    // Toggle expanded state
    setFolderTree((prev) => toggleNodeExpanded(prev, node.path));
  };

  const updateNodeChildren = (
    nodes: FolderNode[],
    targetPath: string,
    children: FolderNode[]
  ): FolderNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, children };
      }
      if (node.children.length > 0) {
        return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
      }
      return node;
    });
  };

  const toggleNodeExpanded = (nodes: FolderNode[], targetPath: string): FolderNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      if (node.children.length > 0) {
        return { ...node, children: toggleNodeExpanded(node.children, targetPath) };
      }
      return node;
    });
  };

  const renderFolderNode = (node: FolderNode, depth: number = 0) => {
    const isActive = currentPath === node.path;
    const FolderIcon = node.isExpanded ? FolderOpen : Folder;
    const hasChildren = node.children.length > 0;

    return (
      <div
        key={node.path}
        role="treeitem"
        aria-expanded={hasChildren ? node.isExpanded : undefined}
        aria-selected={isActive}
        aria-level={depth + 1}
      >
        <div
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            isActive && 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(node);
            }}
            className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded cursor-pointer"
            aria-label={node.isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => handleNavigate(node.path)}
            className="flex items-center gap-2 flex-1 cursor-pointer text-left"
            aria-current={isActive ? 'page' : undefined}
          >
            <FolderIcon
              className={cn(
                'w-4 h-4',
                isActive ? 'text-blue-500' : 'text-yellow-500'
              )}
              aria-hidden="true"
            />
            <span className="truncate flex-1 text-left">{node.name}</span>
          </button>
        </div>

        <AnimatePresence>
          {node.isExpanded && node.children.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              role="group"
            >
              {node.children.map((child) => renderFolderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Collapsed sidebar
  if (!sidebarOpen) {
    return (
      <aside
        aria-label="Navigation sidebar (collapsed)"
        className="w-16 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 transition-all duration-200"
      >
        <div className="p-3 flex flex-col items-center gap-2">
          <Tooltip content="Expand sidebar" side="right">
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <PanelLeft className="w-5 h-5" />
            </Button>
          </Tooltip>
          <Tooltip content="Home" side="right">
            <Button variant="ghost" size="icon" onClick={() => handleNavigate(homePath)}>
              <Home className="w-5 h-5" />
            </Button>
          </Tooltip>
          <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
          <Tooltip content="Docs" side="right">
            <Link href="/docs">
              <Button variant="ghost" size="icon">
                <BookOpen className="w-5 h-5" />
              </Button>
            </Link>
          </Tooltip>
          <Tooltip content="Logs & Analytics" side="right">
            <Link href="/logs">
              <Button variant="ghost" size="icon">
                <BarChart2 className="w-5 h-5" />
              </Button>
            </Link>
          </Tooltip>
          {onToggleHistory && (
            <Tooltip content="History" side="right">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleHistory}
                className={cn(showHistory && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20")}
              >
                <History className="w-5 h-5" />
              </Button>
            </Tooltip>
          )}
          {onTogglePerformance && (
            <Tooltip content="Performance" side="right">
              <Button
                variant="ghost"
                size="icon"
                onClick={onTogglePerformance}
                className={cn(showPerformance && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20")}
              >
                <Activity className="w-5 h-5" />
              </Button>
            </Tooltip>
          )}
          {onToggleFolderTree && (
            <Tooltip content="Folder Tree" side="right">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleFolderTree}
                className={cn(showFolderTree && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20")}
              >
                <FolderTree className="w-5 h-5" />
              </Button>
            </Tooltip>
          )}
          <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
          <Tooltip content="Settings" side="right">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </Tooltip>
          <Tooltip content="Pending Approval" side="right">
            <Link href="/pending-approval">
              <Button variant="ghost" size="icon">
                <CheckCircle className="w-5 h-5" />
              </Button>
            </Link>
          </Tooltip>
        </div>
        <div className="mt-auto p-3 flex flex-col items-center">
          <Tooltip content={theme === 'dark' ? 'Light mode' : 'Dark mode'} side="right">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </Tooltip>
        </div>
      </aside>
    );
  }

  // Expanded sidebar
  return (
    <aside
      aria-label="Navigation sidebar"
      style={{ width: '280px', height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}
      className="bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h1 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">GenOrganize</h1>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <PanelLeftClose className="w-5 h-5" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => handleNavigate(homePath)}
        >
          <Home className="w-4 h-4" />
          Home
        </Button>
      </div>

      {/* Shortcuts */}
      {folderShortcuts.length > 0 && (
        <nav className="p-2 border-b border-zinc-200 dark:border-zinc-800" aria-label="Folder shortcuts">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-3 py-2 uppercase tracking-wider">
            Shortcuts
          </div>
          {folderShortcuts.map((shortcut, index) => {
            const isActive = currentPath === shortcut.path;
            return (
              <button
                key={index}
                onClick={() => handleNavigate(shortcut.path)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200',
                  'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                  isActive && 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                )}
              >
                <Folder className={cn('w-4 h-4', isActive ? 'text-blue-500' : 'text-yellow-500')} aria-hidden="true" />
                <span className="truncate">{shortcut.name}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Panels Section */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-3 py-2 uppercase tracking-wider">
          Panels
        </div>
        <Link href="/docs" className="w-full">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <BookOpen className="w-4 h-4" />
            Docs
          </Button>
        </Link>
        <Link href="/logs" className="w-full">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <BarChart2 className="w-4 h-4" />
            Logs & Analytics
          </Button>
        </Link>
        {onToggleHistory && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              showHistory && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            )}
            onClick={onToggleHistory}
          >
            <History className="w-4 h-4" />
            History
          </Button>
        )}
        {onTogglePerformance && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              showPerformance && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            )}
            onClick={onTogglePerformance}
          >
            <Activity className="w-4 h-4" />
            Performance
          </Button>
        )}
        {onToggleFolderTree && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              showFolderTree && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            )}
            onClick={onToggleFolderTree}
          >
            <FolderTree className="w-4 h-4" />
            Tree
          </Button>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
        <Link href="/pending-approval" className="w-full">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <CheckCircle className="w-4 h-4" />
            Pending Approval
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
