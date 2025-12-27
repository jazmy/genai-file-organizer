'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Edit2, Trash2, RotateCcw, Folder, Save, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  getAllPrompts, 
  updatePrompt, 
  resetPromptToDefault, 
  createFileType, 
  deleteFileType,
  type PromptData 
} from '@/lib/api/config';
import { getConfig, saveConfig } from '@/lib/api/config';

interface FolderRule {
  type: string;
  destination: string;
}

export default function FileTypesPage() {
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [folderRules, setFolderRules] = useState<FolderRule[]>([]);
  const [foldersEnabled, setFoldersEnabled] = useState(false);
  const [createIfMissing, setCreateIfMissing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ prompt: '', description: '', folder: '' });
  const [saving, setSaving] = useState(false);
  
  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', prompt: '', description: '', folder: '' });
  const [creating, setCreating] = useState(false);

  // Categorization prompt state
  const [editingCategorization, setEditingCategorization] = useState(false);
  const [categorizationForm, setCategorizationForm] = useState('');

  // Global naming rules state
  const [editingGlobalRules, setEditingGlobalRules] = useState(false);
  const [globalRulesForm, setGlobalRulesForm] = useState('');

  // Validation prompt state
  const [editingValidation, setEditingValidation] = useState(false);
  const [validationForm, setValidationForm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [promptsResult, config] = await Promise.all([
        getAllPrompts(),
        getConfig()
      ]);
      if (promptsResult.success) {
        setPrompts(promptsResult.prompts);
      }
      setFolderRules(config.folders?.rules || []);
      setFoldersEnabled(config.folders?.enabled || false);
      setCreateIfMissing(config.folders?.createIfMissing ?? true);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategorizationPrompt = () => {
    return prompts.find(p => p.category === '_categorization');
  };

  const getGlobalNamingRules = () => {
    return prompts.find(p => p.category === '_global_naming_rules');
  };

  const getValidationPrompt = () => {
    return prompts.find(p => p.category === '_filename_validation');
  };

  const getFilteredPrompts = () => {
    return prompts
      .filter(p => !p.category.startsWith('_'))
      .filter(p =>
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Custom types first, then alphabetical
        if (a.is_default !== b.is_default) {
          return a.is_default - b.is_default;
        }
        return a.category.localeCompare(b.category);
      });
  };

  const getFolderForCategory = (category: string) => {
    const rule = folderRules.find(r => r.type === category);
    return rule?.destination || '';
  };

  const formatCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleEditCategorization = () => {
    const catPrompt = getCategorizationPrompt();
    if (catPrompt) {
      setCategorizationForm(catPrompt.prompt);
      setEditingCategorization(true);
    }
  };

  const handleCancelCategorizationEdit = () => {
    setEditingCategorization(false);
    setCategorizationForm('');
  };

  const handleSaveCategorization = async () => {
    const catPrompt = getCategorizationPrompt();
    if (!catPrompt || categorizationForm === catPrompt.prompt) return;
    setSaving(true);
    try {
      await updatePrompt('_categorization', categorizationForm);
      await loadData();
      setEditingCategorization(false);
      setCategorizationForm('');
    } catch (err) {
      console.error('Failed to save categorization prompt:', err);
      alert('Failed to save categorization prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCategorization = async () => {
    if (!confirm('Reset the categorization prompt to its default? This cannot be undone.')) return;
    setSaving(true);
    try {
      await resetPromptToDefault('_categorization');
      await loadData();
      const newPrompt = prompts.find(p => p.category === '_categorization');
      if (newPrompt) {
        setCategorizationForm(newPrompt.prompt);
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setSaving(false);
    }
  };

  // Global Naming Rules handlers
  const handleEditGlobalRules = () => {
    const globalRules = getGlobalNamingRules();
    if (globalRules) {
      setGlobalRulesForm(globalRules.prompt);
      setEditingGlobalRules(true);
    }
  };

  const handleCancelGlobalRulesEdit = () => {
    setEditingGlobalRules(false);
    setGlobalRulesForm('');
  };

  const handleSaveGlobalRules = async () => {
    const globalRules = getGlobalNamingRules();
    if (!globalRules || globalRulesForm === globalRules.prompt) return;
    setSaving(true);
    try {
      await updatePrompt('_global_naming_rules', globalRulesForm);
      await loadData();
      setEditingGlobalRules(false);
      setGlobalRulesForm('');
    } catch (err) {
      console.error('Failed to save global naming rules:', err);
      alert('Failed to save global naming rules');
    } finally {
      setSaving(false);
    }
  };

  const handleResetGlobalRules = async () => {
    if (!confirm('Reset the global naming rules to default? This cannot be undone.')) return;
    setSaving(true);
    try {
      await resetPromptToDefault('_global_naming_rules');
      await loadData();
      const newPrompt = prompts.find(p => p.category === '_global_naming_rules');
      if (newPrompt) {
        setGlobalRulesForm(newPrompt.prompt);
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setSaving(false);
    }
  };

  // Validation Prompt handlers
  const handleEditValidation = () => {
    const validationPrompt = getValidationPrompt();
    if (validationPrompt) {
      setValidationForm(validationPrompt.prompt);
      setEditingValidation(true);
    }
  };

  const handleCancelValidationEdit = () => {
    setEditingValidation(false);
    setValidationForm('');
  };

  const handleSaveValidation = async () => {
    const validationPrompt = getValidationPrompt();
    if (!validationPrompt || validationForm === validationPrompt.prompt) return;
    setSaving(true);
    try {
      await updatePrompt('_filename_validation', validationForm);
      await loadData();
      setEditingValidation(false);
      setValidationForm('');
    } catch (err) {
      console.error('Failed to save validation prompt:', err);
      alert('Failed to save validation prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleResetValidation = async () => {
    if (!confirm('Reset the validation prompt to default? This cannot be undone.')) return;
    setSaving(true);
    try {
      await resetPromptToDefault('_filename_validation');
      await loadData();
      const newPrompt = prompts.find(p => p.category === '_filename_validation');
      if (newPrompt) {
        setValidationForm(newPrompt.prompt);
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: string) => {
    const prompt = prompts.find(p => p.category === category);
    if (prompt) {
      setEditingCategory(category);
      setEditForm({
        prompt: prompt.prompt,
        description: prompt.description || '',
        folder: getFolderForCategory(category)
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditForm({ prompt: '', description: '', folder: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    setSaving(true);
    try {
      // Update prompt with description
      await updatePrompt(editingCategory, editForm.prompt, editForm.description || undefined);
      
      // Update folder rule
      const newRules = folderRules.filter(r => r.type !== editingCategory);
      if (editForm.folder.trim()) {
        newRules.push({ type: editingCategory, destination: editForm.folder.trim() });
      }
      
      const config = await getConfig();
      await saveConfig({
        ...config,
        folders: { ...config.folders, rules: newRules }
      });
      
      // Reload data
      await loadData();
      setEditingCategory(null);
      setEditForm({ prompt: '', description: '', folder: '' });
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    const newEnabled = !foldersEnabled;
    setFoldersEnabled(newEnabled);
    setSaving(true);
    try {
      const config = await getConfig();
      await saveConfig({
        ...config,
        folders: { ...config.folders, enabled: newEnabled }
      });
      window.dispatchEvent(new Event('config-updated'));
    } catch (err) {
      console.error('Failed to save:', err);
      setFoldersEnabled(!newEnabled); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCreateIfMissing = async () => {
    const newValue = !createIfMissing;
    setCreateIfMissing(newValue);
    setSaving(true);
    try {
      const config = await getConfig();
      await saveConfig({
        ...config,
        folders: { ...config.folders, createIfMissing: newValue }
      });
      window.dispatchEvent(new Event('config-updated'));
    } catch (err) {
      console.error('Failed to save:', err);
      setCreateIfMissing(!newValue); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (category: string) => {
    if (!confirm(`Reset "${formatCategoryLabel(category)}" to its default prompt?`)) return;
    setSaving(true);
    try {
      await resetPromptToDefault(category);
      await loadData();
      if (editingCategory === category) {
        const prompt = prompts.find(p => p.category === category);
        if (prompt) {
          setEditForm(prev => ({ ...prev, prompt: prompt.prompt }));
        }
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: string) => {
    const prompt = prompts.find(p => p.category === category);
    if (prompt?.is_default === 1) {
      alert('Cannot delete default file types. You can only modify their prompts.');
      return;
    }
    if (!confirm(`Delete "${formatCategoryLabel(category)}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deleteFileType(category);
      await loadData();
      if (editingCategory === category) {
        setEditingCategory(null);
        setEditForm({ prompt: '', description: '', folder: '' });
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.prompt.trim()) return;
    setCreating(true);
    try {
      const category = createForm.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const result = await createFileType(
        category,
        createForm.prompt.trim(),
        createForm.description.trim() || undefined,
        createForm.folder.trim() || undefined
      );
      if (result.success) {
        await loadData();
        setShowCreateForm(false);
        setCreateForm({ name: '', prompt: '', description: '', folder: '' });
      } else {
        alert(result.error || 'Failed to create file type');
      }
    } catch (err) {
      console.error('Failed to create:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredPrompts = getFilteredPrompts();
  const categorizationPrompt = getCategorizationPrompt();
  const globalNamingRules = getGlobalNamingRules();

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                File Types
              </h1>
              <p className="text-sm text-zinc-500">
                Manage file categories, prompts, and folder destinations
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Organization Settings */}
        <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Auto-Organize
                </span>
                <button
                  onClick={handleToggleEnabled}
                  disabled={saving}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    foldersEnabled ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                    foldersEnabled ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Create Missing Folders
                </span>
                <button
                  onClick={handleToggleCreateIfMissing}
                  disabled={saving}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    createIfMissing ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                    createIfMissing ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              {foldersEnabled ? 'Files will be moved to their designated folders' : 'Organization is disabled'}
            </p>
          </div>
        </div>

        {/* Categorization Prompt */}
        {categorizationPrompt && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            {editingCategorization ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Categorization Prompt
                    </h2>
                    <p className="text-sm text-zinc-500">
                      This prompt determines how files are classified into categories
                    </p>
                  </div>
                  <button
                    onClick={handleCancelCategorizationEdit}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <textarea
                    value={categorizationForm}
                    onChange={(e) => setCategorizationForm(e.target.value)}
                    className="w-full h-80 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 font-mono resize-y"
                    placeholder="Enter categorization prompt..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 text-orange-600 hover:text-orange-700"
                    onClick={handleResetCategorization}
                    disabled={saving}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelCategorizationEdit}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="gap-1"
                      onClick={handleSaveCategorization}
                      loading={saving}
                      disabled={categorizationForm === categorizationPrompt.prompt}
                    >
                      <Save className="w-3 h-3" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors rounded-xl"
                onClick={handleEditCategorization}
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Categorization Prompt
                    </h3>
                    <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded">
                      System
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    Determines how files are classified into categories like photo, invoice, document, etc.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCategorization();
                    }}
                    className="p-2 text-purple-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Naming Rules */}
        {globalNamingRules && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-green-50 dark:from-amber-900/20 dark:to-green-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            {editingGlobalRules ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Global File Type Prompt
                    </h2>
                    <p className="text-sm text-zinc-500">
                      These rules are prepended to ALL file type prompts for consistent naming standards
                    </p>
                  </div>
                  <button
                    onClick={handleCancelGlobalRulesEdit}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <textarea
                    value={globalRulesForm}
                    onChange={(e) => setGlobalRulesForm(e.target.value)}
                    className="w-full h-80 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 font-mono resize-y"
                    placeholder="Enter global naming rules..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 text-orange-600 hover:text-orange-700"
                    onClick={handleResetGlobalRules}
                    disabled={saving}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelGlobalRulesEdit}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="gap-1"
                      onClick={handleSaveGlobalRules}
                      loading={saving}
                      disabled={globalRulesForm === globalNamingRules.prompt}
                    >
                      <Save className="w-3 h-3" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors rounded-xl"
                onClick={handleEditGlobalRules}
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Global File Type Prompt
                    </h3>
                    <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded">
                      System
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    Rules prepended to all file type prompts (no punctuation, lowercase, date format, etc.)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditGlobalRules();
                    }}
                    className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validation Prompt */}
        {getValidationPrompt() && (
          <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
            {editingValidation ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Validation Prompt
                    </h2>
                    <p className="text-sm text-zinc-500">
                      This prompt validates generated filenames for quality and adherence to rules
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <textarea
                    value={validationForm}
                    onChange={(e) => setValidationForm(e.target.value)}
                    className="w-full h-80 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 font-mono resize-y"
                    placeholder="Enter validation prompt..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 text-red-500"
                    onClick={handleResetValidation}
                    disabled={saving}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelValidationEdit}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="gap-1"
                      onClick={handleSaveValidation}
                      loading={saving}
                      disabled={validationForm === getValidationPrompt()?.prompt}
                    >
                      <Save className="w-3 h-3" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-colors rounded-xl"
                onClick={handleEditValidation}
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Filename Validation Prompt
                  </h3>
                  <p className="text-sm text-zinc-500 truncate">
                    Validates filenames for quality (prefix, descriptive content, brand/title extraction)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditValidation();
                    }}
                    className="p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file types..."
              className="pl-10"
            />
          </div>
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-4 h-4" />
            Add File Type
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Create New File Type
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateForm({ name: '', prompt: '', description: '', folder: '' });
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Type Name *
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., contract, whitepaper, legal_document"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Will be converted to lowercase with underscores
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Folder Destination
                </label>
                <div className="relative">
                  <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    value={createForm.folder}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, folder: e.target.value }))}
                    placeholder="e.g., ./Documents/Contracts"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category Description *
              </label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., legal contracts, agreements, NDAs, terms of service"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Helps the AI decide which files belong in this category
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Filename Generation Prompt *
              </label>
              <textarea
                value={createForm.prompt}
                onChange={(e) => setCreateForm(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder={`Generate a filename for this [TYPE].\n\nFORMAT: [prefix]_[field1]_[field2]_[date].ext\n\nRULES:\n- field1: Description of what to extract\n- field2: Another field\n- date: YYYY-MM-DD format if found\n\nExamples:\n- example_filename_2024-12-15.pdf\n\nOutput ONLY the filename:`}
                className="w-full h-48 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 font-mono resize-y"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateForm({ name: '', prompt: '', description: '', folder: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                loading={creating}
                disabled={!createForm.name.trim() || !createForm.prompt.trim()}
              >
                Create File Type
              </Button>
            </div>
          </div>
        )}

        {/* File Types List */}
        <div className="space-y-3">
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              {searchQuery ? 'No file types match your search' : 'No file types found'}
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.category}
                className={cn(
                  "bg-white dark:bg-zinc-900 rounded-xl border transition-colors",
                  editingCategory === prompt.category
                    ? "border-blue-500 dark:border-blue-500"
                    : "border-zinc-200 dark:border-zinc-800"
                )}
              >
                {editingCategory === prompt.category ? (
                  // Edit Mode
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Editing: {formatCategoryLabel(prompt.category)}
                      </h3>
                      <div className="flex items-center gap-2">
                        {prompt.is_default === 1 && (
                          <span className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                            Default
                          </span>
                        )}
                        {prompt.is_default === 0 && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Category Description
                        </label>
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="e.g., reports, analysis, findings, summaries"
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Helps the AI decide which files belong in this category
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Folder Destination
                        </label>
                        <div className="relative">
                          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <Input
                            value={editForm.folder}
                            onChange={(e) => setEditForm(prev => ({ ...prev, folder: e.target.value }))}
                            placeholder="e.g., ./Documents/Reports"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Filename Generation Prompt
                      </label>
                      <textarea
                        value={editForm.prompt}
                        onChange={(e) => setEditForm(prev => ({ ...prev, prompt: e.target.value }))}
                        className="w-full h-64 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 font-mono resize-y"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {prompt.is_default === 1 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1 text-orange-600 hover:text-orange-700"
                            onClick={() => handleReset(prompt.category)}
                            disabled={saving}
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset to Default
                          </Button>
                        )}
                        {prompt.is_default === 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(prompt.category)}
                            disabled={saving}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="gap-1"
                          onClick={handleSaveEdit}
                          loading={saving}
                        >
                          <Save className="w-3 h-3" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // List Mode
                  <div 
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    onClick={() => handleEdit(prompt.category)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {formatCategoryLabel(prompt.category)}
                        </h3>
                        {prompt.is_default === 0 && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        {getFolderForCategory(prompt.category) && (
                          <span className="flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            {getFolderForCategory(prompt.category)}
                          </span>
                        )}
                        <span className="truncate max-w-md">
                          {prompt.prompt.split('\n')[0].substring(0, 60)}...
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(prompt.category);
                        }}
                        className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {prompt.is_default === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(prompt.category);
                          }}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>
              {filteredPrompts.length} file type{filteredPrompts.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <span>
              {prompts.filter(p => p.is_default === 0 && !p.category.startsWith('_')).length} custom types
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
