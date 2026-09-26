import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, setConfirmDialog } = useApp();

  if (!confirmDialog || !confirmDialog.isOpen) return null;

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    setConfirmDialog(null);
  };

  const handleCancel = () => {
    setConfirmDialog(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-3)]">
          <div className="flex items-center space-x-2 text-[var(--danger-text)] font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{confirmDialog.title}</span>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-[var(--surface-6)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          {confirmDialog.message}
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
            className="px-4 py-1.5 rounded bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-[var(--text-on-accent)] text-xs font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
