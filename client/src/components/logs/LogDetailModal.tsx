'use client';

import { X, Copy, CheckCircle, XCircle, Clock, File, Cpu, ArrowRight, ShieldCheck, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import type { AILog } from '@/types/logs';

interface LogDetailModalProps {
  log: AILog;
  onClose: () => void;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
    >
      {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

const statusConfig = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  timeout: { icon: XCircle, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
};

export function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'categorization' | 'naming' | 'validation' | 'error'>('overview');
  const config = statusConfig[log.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Parse validation history if available
  const validationHistory = log.validation_history ? JSON.parse(log.validation_history) : [];
  const hasValidation = log.validation_attempts !== null && log.validation_attempts > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', config.bg)}>
              <StatusIcon className={cn('w-5 h-5', config.color)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Request Details
              </h2>
              <p className="text-sm text-zinc-500 font-mono">{log.request_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6">
          {['overview', 'categorization', 'naming', ...(hasValidation ? ['validation'] : []), ...(log.error_message ? ['error'] : [])].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors capitalize flex items-center gap-1.5',
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              {tab === 'validation' && (
                log.validation_passed
                  ? <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  : <ShieldX className="w-3.5 h-3.5 text-orange-500" />
              )}
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* File Info */}
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-3">File Information</h3>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{log.file_name}</p>
                      <p className="text-sm text-zinc-500 truncate">{log.file_path}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Type:</span>
                      <span className="ml-2 text-zinc-900 dark:text-zinc-100">{log.file_type || '-'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Size:</span>
                      <span className="ml-2 text-zinc-900 dark:text-zinc-100">
                        {log.file_size ? `${(log.file_size / 1024).toFixed(1)} KB` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Result */}
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-3">Processing Result</h3>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-500 mb-1">Original</p>
                      <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{log.file_name}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-400" />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-500 mb-1">Suggested</p>
                      <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{log.suggested_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-zinc-500">Category:</span>
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 rounded">
                        {log.detected_category || '-'}
                      </span>
                    </div>
                    {log.user_action && (
                      <div>
                        <span className="text-sm text-zinc-500">User Action:</span>
                        <span className={cn(
                          'ml-2 px-2 py-0.5 text-xs font-medium rounded capitalize',
                          log.user_action === 'accepted' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          log.user_action === 'edited' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                          log.user_action === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          log.user_action === 'skipped' && 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                        )}>
                          {log.user_action}
                        </span>
                      </div>
                    )}
                    {log.final_name && log.final_name !== log.suggested_name && (
                      <div>
                        <span className="text-sm text-zinc-500">Final:</span>
                        <span className="ml-2 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                          {log.final_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-3">Timing</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Total</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDuration(log.total_time_ms)}
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Categorization</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDuration(log.categorization_time_ms)}
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Naming</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDuration(log.naming_time_ms)}
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Model</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      {log.model_used || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-3">Timestamps</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Created:</span>
                    <span className="ml-2 text-zinc-900 dark:text-zinc-100">{formatDateTime(log.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Completed:</span>
                    <span className="ml-2 text-zinc-900 dark:text-zinc-100">{formatDateTime(log.completed_at)}</span>
                  </div>
                  {log.feedback_at && (
                    <div>
                      <span className="text-zinc-500">Feedback:</span>
                      <span className="ml-2 text-zinc-900 dark:text-zinc-100">{formatDateTime(log.feedback_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categorization' && (
            <div className="space-y-4">
              {/* AI Reasoning */}
              {log.categorization_reasoning && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <span className="text-lg">💭</span> AI Reasoning
                  </h3>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {log.categorization_reasoning}
                  </p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-500">Prompt</h3>
                  {log.categorization_prompt && (
                    <CopyButton text={log.categorization_prompt} label="Copy prompt" />
                  )}
                </div>
                <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap font-mono">
                  {log.categorization_prompt || 'No prompt recorded'}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-500">Response</h3>
                  {log.categorization_response && (
                    <CopyButton text={log.categorization_response} label="Copy response" />
                  )}
                </div>
                <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap font-mono">
                  {log.categorization_response || 'No response recorded'}
                </pre>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-500">Detected:</span>
                <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded font-medium">
                  {log.detected_category || '-'}
                </span>
                <span className="text-zinc-500">Time:</span>
                <span className="font-medium">{formatDuration(log.categorization_time_ms)}</span>
              </div>
            </div>
          )}

          {activeTab === 'naming' && (
            <div className="space-y-4">
              {/* AI Reasoning */}
              {log.naming_reasoning && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                    <span className="text-lg">💭</span> AI Reasoning
                  </h3>
                  <p className="text-sm text-green-900 dark:text-green-100">
                    {log.naming_reasoning}
                  </p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-500">Prompt</h3>
                  {log.naming_prompt && (
                    <CopyButton text={log.naming_prompt} label="Copy prompt" />
                  )}
                </div>
                <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap font-mono">
                  {log.naming_prompt || 'No prompt recorded'}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-500">Response</h3>
                  {log.naming_response && (
                    <CopyButton text={log.naming_response} label="Copy response" />
                  )}
                </div>
                <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap font-mono">
                  {log.naming_response || 'No response recorded'}
                </pre>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-500">Suggested:</span>
                <span className="font-mono font-medium">{log.suggested_name || '-'}</span>
                <span className="text-zinc-500">Time:</span>
                <span className="font-medium">{formatDuration(log.naming_time_ms)}</span>
              </div>
            </div>
          )}

          {activeTab === 'validation' && hasValidation && (
            <div className="space-y-4">
              {/* Validation Summary */}
              <div className={cn(
                'rounded-lg p-4 border',
                log.validation_passed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              )}>
                <div className="flex items-center gap-3 mb-3">
                  {log.validation_passed ? (
                    <ShieldCheck className="w-6 h-6 text-green-500" />
                  ) : (
                    <ShieldX className="w-6 h-6 text-orange-500" />
                  )}
                  <div>
                    <p className={cn(
                      'font-semibold',
                      log.validation_passed ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'
                    )}>
                      {log.validation_passed ? 'Validation Passed' : 'Validation Failed'}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {log.validation_attempts} attempt{log.validation_attempts !== 1 ? 's' : ''} • {formatDuration(log.validation_time_ms)}
                    </p>
                  </div>
                </div>
                {log.validation_reason && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">Reason:</span> {log.validation_reason}
                  </p>
                )}
                {!log.validation_passed && log.validation_suggested_fix && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2">
                    <span className="font-medium">Suggestion:</span> {log.validation_suggested_fix}
                  </p>
                )}
              </div>

              {/* Validation History */}
              {validationHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-500 mb-3">Attempt History</h3>
                  <div className="space-y-3">
                    {validationHistory.map((attempt: { attempt: number; filename: string; valid: boolean; reason: string; suggestedFix?: string; timeMs?: number }, idx: number) => (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-lg p-3 border',
                          attempt.valid
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {attempt.valid ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-zinc-400" />
                          )}
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Attempt {attempt.attempt}
                          </span>
                          {attempt.timeMs && (
                            <span className="text-xs text-zinc-500">
                              ({formatDuration(attempt.timeMs)})
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                          {attempt.filename || '-'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {attempt.reason}
                        </p>
                        {!attempt.valid && attempt.suggestedFix && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            💡 {attempt.suggestedFix}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Validation Prompt */}
              {log.validation_prompt && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-500">Last Validation Prompt</h3>
                    <CopyButton text={log.validation_prompt} label="Copy prompt" />
                  </div>
                  <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                    {log.validation_prompt}
                  </pre>
                </div>
              )}

              {/* Last Validation Response */}
              {log.validation_response && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-500">Last Validation Response</h3>
                    <CopyButton text={log.validation_response} label="Copy response" />
                  </div>
                  <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap font-mono">
                    {log.validation_response}
                  </pre>
                </div>
              )}

              {/* Validation Model */}
              {log.validation_model && (
                <div className="flex items-center gap-2 text-sm">
                  <Cpu className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Model:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{log.validation_model}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'error' && log.error_message && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-2">Error Message</h3>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400">{log.error_message}</p>
                </div>
              </div>
              {log.error_stack && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-500">Stack Trace</h3>
                    <CopyButton text={log.error_stack} label="Copy stack" />
                  </div>
                  <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto whitespace-pre-wrap font-mono">
                    {log.error_stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
