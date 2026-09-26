import React from 'react';
import { FolderGit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StatusBar: React.FC = () => {
  const { statusMessage, repoPath, isOperating } = useApp();

  return (
    <footer className="flex items-center justify-between px-3 py-1 bg-[var(--surface-0)] border-t border-[var(--border-subtle)] text-[11px] select-none">
      {/* Left Status */}
      <div className="flex items-center space-x-1.5 overflow-hidden pr-2">
        {statusMessage.isError ? (
          <AlertCircle className="w-3.5 h-3.5 text-[var(--danger-text)] shrink-0" />
        ) : isOperating ? (
          <div className="w-2 h-2 rounded-full bg-[var(--accent-text)] animate-ping shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--badge-success-text)] shrink-0" />
        )}

        <span
          className={`truncate ${
            statusMessage.isError ? 'text-[var(--danger-text)] font-semibold' : 'text-[var(--text-muted)]'
          }`}
          title={statusMessage.text}
        >
          {statusMessage.text}
        </span>
      </div>

      {/* Right Repo Path */}
      <div
        className="flex items-center space-x-1.5 text-[var(--text-faint)] shrink-0 max-w-[450px] truncate"
        title={repoPath}
      >
        <FolderGit2 className="w-3.5 h-3.5 text-[var(--accent-text)]" />
        <span className="truncate font-mono">{repoPath || 'No repository selected'}</span>
      </div>
    </footer>
  );
};
