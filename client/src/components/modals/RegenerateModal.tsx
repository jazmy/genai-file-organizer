'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, FileText, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (feedback: string) => void;
  originalName: string;
  suggestedName: string;
  isLoading?: boolean;
}

export function RegenerateModal({
  isOpen,
  onClose,
  onRegenerate,
  originalName,
  suggestedName,
  isLoading = false,
}: RegenerateModalProps) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    onRegenerate(feedback);
  };

  const handleClose = () => {
    if (!isLoading) {
      setFeedback('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Regenerate Name
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Original Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    <FileText className="w-4 h-4" />
                    Original Filename
                  </label>
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <code className="text-sm text-zinc-700 dark:text-zinc-300 break-all">
                      {originalName}
                    </code>
                  </div>
                </div>

                {/* Suggested Name (rejected) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    <ArrowRight className="w-4 h-4" />
                    Rejected Suggestion
                  </label>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <code className="text-sm text-red-700 dark:text-red-300 break-all">
                      {suggestedName}
                    </code>
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Why was this name not adequate? (Optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="E.g., 'The date is wrong', 'Should include the company name', 'This is an invoice, not a receipt', 'Include the project name'..."
                    className="w-full h-28 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400"
                    disabled={isLoading}
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Your feedback will be used to generate a better filename. Be specific about what&apos;s wrong or what you want included.
                  </p>
                </div>

                {/* Info box */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Tip:</strong> The regeneration will use a potentially smarter model (if configured in Settings &gt; Ollama) to generate a better filename based on your feedback.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Name
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
