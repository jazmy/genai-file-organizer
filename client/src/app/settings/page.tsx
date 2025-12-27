'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Upload,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Folder,
  Server,
  Palette,
  Database,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  getConfig,
  saveConfig,
  resetAllData,
  exportSettings,
  importSettings,
  downloadExportAsFile,
  type ExportData
} from '@/lib/api/config';
import { useUIStore } from '@/stores/uiStore';
import type { FolderShortcut } from '@/types/api';

type TabId = 'general' | 'ai' | 'appearance' | 'data' | 'backup';
type ProviderType = 'ollama' | 'llama-server';

const tabs = [
  { id: 'general' as const, label: 'General', icon: Folder },
  { id: 'ai' as const, label: 'AI Provider', icon: Server },
  { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  { id: 'data' as const, label: 'Data', icon: Database },
  { id: 'backup' as const, label: 'Backup', icon: Download },
];

export default function SettingsPage() {
  const { theme, setTheme, addToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [defaultPath, setDefaultPath] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('ollama');
  const [ollamaHost, setOllamaHost] = useState('http://127.0.0.1:11434');
  const [ollamaModel, setOllamaModel] = useState('qwen3-vl:8b');
  const [categorizationModel, setCategorizationModel] = useState('');
  const [namingModel, setNamingModel] = useState('');
  const [regenerationModel, setRegenerationModel] = useState('');
  const [llamaServerHost, setLlamaServerHost] = useState('http://127.0.0.1:8080');
  const [llamaServerSlots, setLlamaServerSlots] = useState(4);
  const [folderShortcuts, setFolderShortcuts] = useState<FolderShortcut[]>([]);
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutPath, setNewShortcutPath] = useState('');
  const [parallelFiles, setParallelFiles] = useState(3);
  const [enableValidation, setEnableValidation] = useState(true);
  const [validationRetryCount, setValidationRetryCount] = useState(3);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const config = await getConfig();
      setDefaultPath(config.ui?.defaultPath || '');
      setProviderType((config.provider?.type as ProviderType) || 'ollama');
      setOllamaHost(config.ollama?.host || 'http://127.0.0.1:11434');
      setOllamaModel(config.ollama?.model || 'qwen3-vl:8b');
      setCategorizationModel(config.ollama?.categorizationModel || '');
      setNamingModel(config.ollama?.namingModel || '');
      setRegenerationModel(config.ollama?.regenerationModel || '');
      setLlamaServerHost(config.llamaServer?.host || 'http://127.0.0.1:8080');
      setLlamaServerSlots(config.llamaServer?.parallelSlots || 4);
      setFolderShortcuts(config.ui?.folderShortcuts || []);
      setParallelFiles(config.processing?.parallelFiles || 3);
      setEnableValidation(config.processing?.enableValidation !== false);
      setValidationRetryCount(config.processing?.validationRetryCount || 3);
    } catch (err) {
      console.error('Failed to load settings:', err);
      addToast({
        type: 'error',
        title: 'Failed to Load',
        message: 'Could not load settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const addShortcut = () => {
    if (newShortcutName.trim() && newShortcutPath.trim()) {
      setFolderShortcuts([...folderShortcuts, { name: newShortcutName.trim(), path: newShortcutPath.trim() }]);
      setNewShortcutName('');
      setNewShortcutPath('');
    }
  };

  const removeShortcut = (index: number) => {
    setFolderShortcuts(folderShortcuts.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig({
        provider: { type: providerType },
        ui: { defaultPath, theme, folderShortcuts },
        ollama: {
          host: ollamaHost,
          model: ollamaModel,
          categorizationModel,
          namingModel,
          regenerationModel,
        },
        llamaServer: {
          host: llamaServerHost,
          parallelSlots: llamaServerSlots,
        },
        processing: { parallelFiles, enableValidation, validationRetryCount },
      });
      // Notify sidebar to reload config
      window.dispatchEvent(new Event('config-updated'));
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Your settings have been saved successfully',
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    setResetting(true);
    try {
      const result = await resetAllData();
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Data Reset',
          message: 'All logs, queues, and processed files have been cleared',
        });
        setShowResetConfirm(false);
        // Reload the page to reset all client state
        window.location.reload();
      } else {
        addToast({
          type: 'error',
          title: 'Reset Failed',
          message: 'Failed to reset data',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportSettings();
      downloadExportAsFile(data);
      addToast({
        type: 'success',
        title: 'Export Complete',
        message: 'Settings exported successfully',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err instanceof Error ? err.message : 'Failed to export settings',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const data: ExportData = JSON.parse(content);

      if (!data.version) {
        throw new Error('Invalid settings file: missing version');
      }

      const result = await importSettings(data);
      setImportResult({
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Import Complete',
          message: result.message,
        });
        // Trigger config reload event
        window.dispatchEvent(new Event('config-updated'));
        // Reload settings
        await loadSettings();
      } else {
        addToast({
          type: 'error',
          title: 'Import Partial',
          message: result.message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import settings';
      setImportResult({
        success: false,
        message,
      });
      addToast({
        type: 'error',
        title: 'Import Failed',
        message,
      });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4">
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
                  Settings
                </h1>
                <p className="text-sm text-zinc-500">
                  Manage application settings and preferences
                </p>
              </div>
            </div>
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Navigation Cards */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
            Configuration
          </h2>
          <div>
            <Link
              href="/settings/file-types"
              className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    File Types & Prompts
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Manage file categories and AI prompts
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </Link>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Default Home Directory
                      </label>
                      <Input
                        value={defaultPath}
                        onChange={(e) => setDefaultPath(e.target.value)}
                        placeholder="/Users/username/Documents"
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        The folder that opens when you start the app
                      </p>
                    </div>

                    {/* Folder Shortcuts */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Folder Shortcuts
                      </label>
                      <p className="mb-3 text-xs text-zinc-500">
                        Add folders that will appear as shortcuts in the sidebar
                      </p>

                      {/* Existing shortcuts */}
                      {folderShortcuts.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {folderShortcuts.map((shortcut, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                            >
                              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                  {shortcut.name}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">
                                  {shortcut.path}
                                </div>
                              </div>
                              <button
                                onClick={() => removeShortcut(index)}
                                className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new shortcut */}
                      <div className="space-y-2 p-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                        <Input
                          value={newShortcutName}
                          onChange={(e) => setNewShortcutName(e.target.value)}
                          placeholder="Shortcut name (e.g., Downloads)"
                        />
                        <Input
                          value={newShortcutPath}
                          onChange={(e) => setNewShortcutPath(e.target.value)}
                          placeholder="Folder path (e.g., /Users/username/Downloads)"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full gap-2"
                          onClick={addShortcut}
                          disabled={!newShortcutName.trim() || !newShortcutPath.trim()}
                        >
                          <Plus className="w-4 h-4" />
                          Add Shortcut
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Provider Tab */}
                {activeTab === 'ai' && (
                  <div className="space-y-6 max-w-2xl">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        LLM Provider
                      </label>
                      <select
                        value={providerType}
                        onChange={(e) => setProviderType(e.target.value as ProviderType)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="ollama">Ollama</option>
                        <option value="llama-server">llama-server (llama.cpp)</option>
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">
                        Choose your LLM inference backend
                      </p>
                    </div>

                    {/* Ollama-specific settings */}
                    {providerType === 'ollama' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Ollama Host
                          </label>
                          <Input
                            value={ollamaHost}
                            onChange={(e) => setOllamaHost(e.target.value)}
                            placeholder="http://127.0.0.1:11434"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Default Model
                          </label>
                          <Input
                            value={ollamaModel}
                            onChange={(e) => setOllamaModel(e.target.value)}
                            placeholder="qwen3-vl:8b"
                          />
                          <p className="mt-1 text-xs text-zinc-500">
                            Default model used when step-specific models are not set
                          </p>
                        </div>

                        {/* Step-specific models */}
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                            Step-Specific Models (Optional)
                          </h4>
                          <p className="text-xs text-zinc-500 mb-4">
                            Leave empty to use the default model. Use different models for each step to optimize speed or quality.
                          </p>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Categorization Model
                              </label>
                              <Input
                                value={categorizationModel}
                                onChange={(e) => setCategorizationModel(e.target.value)}
                                placeholder="e.g., llama3.1:8b (leave empty for default)"
                              />
                              <p className="mt-1 text-xs text-zinc-500">
                                Model for file type categorization (can be faster/smaller)
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Naming Model
                              </label>
                              <Input
                                value={namingModel}
                                onChange={(e) => setNamingModel(e.target.value)}
                                placeholder="e.g., qwen3-vl:8b (leave empty for default)"
                              />
                              <p className="mt-1 text-xs text-zinc-500">
                                Model for filename generation
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Regeneration Model
                              </label>
                              <Input
                                value={regenerationModel}
                                onChange={(e) => setRegenerationModel(e.target.value)}
                                placeholder="e.g., qwen3-vl:32b (leave empty for default)"
                              />
                              <p className="mt-1 text-xs text-zinc-500">
                                Model for regenerating filenames (use a smarter model for better results)
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* llama-server specific settings */}
                    {providerType === 'llama-server' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            llama-server Host
                          </label>
                          <Input
                            value={llamaServerHost}
                            onChange={(e) => setLlamaServerHost(e.target.value)}
                            placeholder="http://127.0.0.1:8080"
                          />
                          <p className="mt-1 text-xs text-zinc-500">
                            URL of your running llama-server instance
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Parallel Slots
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="1"
                              max="8"
                              value={llamaServerSlots}
                              onChange={(e) => setLlamaServerSlots(Number(e.target.value))}
                              className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="w-8 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {llamaServerSlots}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            Match this with your llama-server -np flag for concurrent requests
                          </p>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                Model Selection
                              </p>
                              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                llama-server uses whichever model you loaded at startup. Model selection is not available here - ensure you start llama-server with a vision-capable model.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                            Example startup command:
                          </p>
                          <code className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded block overflow-x-auto">
                            llama-server -m ~/models/qwen2.5-vl-7b.gguf --host 127.0.0.1 --port 8080 -np 4 -cb -c 8192
                          </code>
                        </div>
                      </>
                    )}

                    {/* Common settings for both providers */}
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Parallel Processing
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={parallelFiles}
                          onChange={(e) => setParallelFiles(Number(e.target.value))}
                          className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="w-8 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {parallelFiles}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Number of files to process simultaneously (higher = faster but more CPU/GPU load)
                      </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        AI Validation
                      </label>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={enableValidation}
                            onChange={(e) => setEnableValidation(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            Enable filename validation
                          </span>
                        </label>
                        <p className="text-xs text-zinc-500">
                          When enabled, a second AI pass validates generated filenames for quality (proper prefix, descriptive content, brand/title extraction)
                        </p>

                        {enableValidation && (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Validation Retry Count
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={validationRetryCount}
                                onChange={(e) => setValidationRetryCount(Number(e.target.value))}
                                className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                              <span className="w-8 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {validationRetryCount}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              Number of attempts before showing &quot;could not validate&quot; warning (1-10)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                        Theme
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setTheme('light')}
                          className={cn(
                            'flex-1 p-4 rounded-xl border-2 transition-all',
                            theme === 'light'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                          )}
                        >
                          <div className="w-full h-16 bg-white border border-zinc-200 rounded-lg mb-2" />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Light
                          </span>
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={cn(
                            'flex-1 p-4 rounded-xl border-2 transition-all',
                            theme === 'dark'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                          )}
                        >
                          <div className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded-lg mb-2" />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Dark
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Tab */}
                {activeTab === 'data' && (
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Reset All Data
                      </h3>
                      <p className="text-xs text-zinc-500 mb-4">
                        Clear all logs, processing queues, and completed file records. This will give you a fresh start while keeping your settings, file types, and prompts intact.
                      </p>

                      {!showResetConfirm ? (
                        <Button
                          variant="secondary"
                          onClick={() => setShowResetConfirm(true)}
                          className="gap-2 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 dark:text-orange-400 dark:border-orange-800 dark:hover:border-orange-700"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Reset Data
                        </Button>
                      ) : (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                Are you sure?
                              </p>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                This will permanently delete:
                              </p>
                              <ul className="text-xs text-orange-600 dark:text-orange-400 mt-1 list-disc list-inside">
                                <li>All AI and API logs</li>
                                <li>Processing queue history</li>
                                <li>Processed file records</li>
                                <li>Folder shortcuts</li>
                              </ul>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                Your other settings, file types, and prompts will be preserved.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowResetConfirm(false)}
                              disabled={resetting}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleResetData}
                              loading={resetting}
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                              Yes, Reset All Data
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Backup Tab */}
                {activeTab === 'backup' && (
                  <div className="space-y-6 max-w-2xl">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Export your settings to a JSON file for backup or transfer to another instance.
                      Import previously exported settings to restore your configuration.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <Download className="w-5 h-5 text-green-600" />
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                            Export Settings
                          </h3>
                        </div>
                        <p className="text-sm text-zinc-500 mb-4">
                          Download configuration and custom prompts as a JSON file.
                        </p>
                        <Button
                          variant="primary"
                          onClick={handleExport}
                          loading={exporting}
                          className="w-full gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export to File
                        </Button>
                      </div>

                      <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <Upload className="w-5 h-5 text-blue-600" />
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                            Import Settings
                          </h3>
                        </div>
                        <p className="text-sm text-zinc-500 mb-4">
                          Restore configuration from a previously exported JSON file.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          variant="secondary"
                          onClick={handleImportClick}
                          loading={importing}
                          className="w-full gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Import from File
                        </Button>
                      </div>
                    </div>

                    {/* Import Result */}
                    {importResult && (
                      <div className={`p-4 rounded-lg flex items-start gap-3 ${
                        importResult.success
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      }`}>
                        {importResult.success ? (
                          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="text-sm">
                          {importResult.message}
                        </div>
                      </div>
                    )}

                    {/* Info Section */}
                    <div className="text-sm text-zinc-500 space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <p>
                        <strong>Export includes:</strong> Application configuration, custom file types,
                        and all prompt customizations.
                      </p>
                      <p>
                        <strong>Note:</strong> Importing will update existing settings. Custom file types
                        will be merged with existing ones.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
