import React, { useRef, useEffect } from 'react';
import { Sparkles, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CommitBar: React.FC = () => {
  const {
    commitMessage,
    setCommitMessage,
    commitAndPush,
    aiCommitAndPush,
    resetAll,
    aiSettings,
    setIsSettingsOpen,
    isOperating,
  } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (isCmdOrCtrl && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        aiCommitAndPush();
      } else if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        commitAndPush();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aiCommitAndPush, commitAndPush]);

  const getPrefixLabel = () => {
    switch (aiSettings.prefixMode) {
      case 'AutoFolder':
        return 'Auto Folder Tag';
      case 'Custom':
        return aiSettings.customPrefix ? `Prefix: ${aiSettings.customPrefix}` : 'Custom Prefix';
      case 'Both':
        return 'Both (Folder + Custom)';
      case 'None':
        return 'No Prefix';
      default:
        return 'Auto Folder Tag';
    }
  };

  return (
    <div className="px-3 py-2 border-b border-[var(--border-default)] bg-[var(--surface-1)]">
      <div className="flex items-center space-x-2">
        {/* AI Commit & Push Button */}
        <button
          onClick={() => aiCommitAndPush()}
          disabled={isOperating}
          title="Generate an OpenAI-compatible commit message, commit, and push changes (Ctrl + I)"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--selection)] hover:bg-[var(--selection-strong)] text-[var(--accent-text)] border border-[var(--selection-border)] text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--text-warning)]" />
          <span>✨ AI Commit &amp; Push (Ctrl + I)</span>
        </button>

        {/* Prefix Indicator Pill */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          title="Current Git commit prefix mode. Click to configure prefix in Settings."
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[var(--accent-text)] border border-[var(--border-default)] text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{getPrefixLabel()}</span>
        </button>

        {/* Commit Message Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commitAndPush();
              }
            }}
            placeholder="Commit message (Ctrl + Enter to commit & push)"
            className="w-full px-3 py-1.5 text-xs bg-[var(--surface-0)] text-[var(--text-on-accent)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder-[var(--text-faint)]"
          />
        </div>

        {/* Reset All */}
        <button
          onClick={() => resetAll()}
          disabled={isOperating}
          title="Reset all unstaged and untracked changes in working tree"
          className="px-3 py-1.5 rounded bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-[var(--text-on-accent)] text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
        >
          Reset All
        </button>

        {/* Commit & Push */}
        <button
          onClick={() => commitAndPush()}
          disabled={isOperating}
          title="Commit changes and push to remote"
          className="px-3.5 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
        >
          Commit &amp; Push
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-1 text-[11px] text-[var(--text-faint)] px-1 select-none">
        Ctrl + Enter to commit &amp; push, Ctrl + G to focus tb, Ctrl + R to refresh, Ctrl + I for AI commit
      </div>
    </div>
  );
};
