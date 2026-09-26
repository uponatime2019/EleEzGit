import React from 'react';
import { ArrowLeft, Copy, User, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const RecentCommitHeader: React.FC = () => {
  const { selectedCommit, exitCommitMode, copyText } = useApp();

  if (!selectedCommit) return null;

  return (
    <div className="px-4 py-2.5 bg-[var(--selection)] border-b border-[var(--selection-border)] flex items-center justify-between">
      <div className="flex-1 pr-4">
        <div className="flex items-center space-x-2">
          {selectedCommit.tagSection && (
            <span className="font-bold text-[var(--accent-text)] text-sm">{selectedCommit.tagSection}</span>
          )}
          <span className="font-semibold text-[var(--text-primary)] text-sm">{selectedCommit.messageSection}</span>
        </div>
        <div className="flex items-center space-x-4 mt-1 text-xs text-[var(--syntax-blue)]">
          <button
            onClick={() => copyText(selectedCommit.hash)}
            title="Click to copy full commit hash"
            className="flex items-center space-x-1 font-mono text-[var(--syntax-green)] hover:underline"
          >
            <span>{selectedCommit.shortHash}</span>
            <Copy className="w-3 h-3" />
          </button>
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>{selectedCommit.author}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{selectedCommit.date}</span>
          </div>
        </div>
      </div>

      <button
        onClick={exitCommitMode}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] text-xs font-semibold shadow-sm transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Files</span>
      </button>
    </div>
  );
};
