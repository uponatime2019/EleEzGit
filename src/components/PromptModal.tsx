import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PromptModal: React.FC = () => {
  const { promptDialog, setPromptDialog } = useApp();
  const [val, setVal] = useState<string>('');

  useEffect(() => {
    if (promptDialog?.isOpen) {
      setVal(promptDialog.initialValue || '');
    }
  }, [promptDialog]);

  if (!promptDialog || !promptDialog.isOpen) return null;

  const handleConfirm = () => {
    promptDialog.onConfirm(val);
    setPromptDialog(null);
  };

  const handleCancel = () => {
    setPromptDialog(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-3)]">
          <div className="flex items-center space-x-2 text-[var(--accent-text)] font-bold text-sm">
            <Sparkles className="w-4 h-4 text-[var(--text-warning)]" />
            <span>{promptDialog.title}</span>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-[var(--surface-6)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            autoFocus
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
            placeholder={promptDialog.placeholder || 'Enter commit message...'}
            className="w-full px-3 py-2 text-xs bg-[var(--surface-0)] text-[var(--text-primary)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)] placeholder-[var(--text-faint)]"
          />
        </div>

        <div className="flex items-center justify-end space-x-2 px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-3)]">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 rounded bg-[var(--surface-5)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] text-xs font-semibold"
          >
            Commit &amp; Push
          </button>
        </div>
      </div>
    </div>
  );
};
