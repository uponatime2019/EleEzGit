import React from 'react';
import appLogo from '../../assets/AppIcon.png';
import {
  RotateCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Settings,
  Sun,
  Moon,
  Laptop,
  Minus,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const {
    refreshData,
    gitPull,
    gitPush,
    gitSync,
    setIsSettingsOpen,
    diffSettings,
    updateDiffSettings,
    isOperating,
  } = useApp();

  const cycleTheme = () => {
    const nextTheme =
      diffSettings.theme === 'system'
        ? 'dark'
        : diffSettings.theme === 'dark'
        ? 'light'
        : 'system';
    updateDiffSettings({ theme: nextTheme });
  };

  const getThemeIcon = () => {
    if (diffSettings.theme === 'dark') return <Moon className="w-3.5 h-3.5" />;
    if (diffSettings.theme === 'light') return <Sun className="w-3.5 h-3.5" />;
    return <Laptop className="w-3.5 h-3.5" />;
  };

  const getThemeLabel = () => {
    if (diffSettings.theme === 'dark') return 'Dark';
    if (diffSettings.theme === 'light') return 'Light';
    return 'System';
  };

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] bg-[var(--surface-2)]">
      {/* Left Action Buttons */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => refreshData()}
          disabled={isOperating}
          title="Refresh Git Status (Ctrl + R)"
          className="p-1.5 rounded bg-[var(--surface-4)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${isOperating ? 'animate-spin' : ''}`} />
        </button>

        <div className="flex items-center space-x-2 px-2">
          <img src={appLogo} alt="EleEzGit" className="w-5 h-5 rounded-xs object-contain" />
          <span className="font-bold text-base text-[var(--accent-text)] tracking-wide">
            EleEzGit
          </span>
        </div>

        <button
          onClick={() => gitPull()}
          disabled={isOperating}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--surface-4)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium transition-colors"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>Git Pull</span>
        </button>

        <button
          onClick={() => gitPush()}
          disabled={isOperating}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--surface-4)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium transition-colors"
        >
          <ArrowUpFromLine className="w-3.5 h-3.5" />
          <span>Git Push</span>
        </button>

        <button
          onClick={() => gitSync()}
          disabled={isOperating}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--surface-4)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Git Sync</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          title="Configure OpenAI API URL, Key, Model, and Git Prefix"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--surface-4)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 text-xs text-[var(--text-muted)]">
        {/* Hide changes when staged */}
        <label className="flex items-center space-x-1.5 cursor-pointer hover:text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={diffSettings.hideChangesWhenStaged}
            onChange={(e) => updateDiffSettings({ hideChangesWhenStaged: e.target.checked })}
            className="w-3.5 h-3.5 rounded bg-[var(--surface-4)] border-[var(--border-strong)] text-[var(--accent)] focus:ring-0 cursor-pointer"
          />
          <span>Hide changes when staged</span>
        </label>

        {/* Tree depth controls */}
        <div className="flex items-center space-x-1 bg-[var(--surface-3)] px-2 py-0.5 rounded border border-[var(--border-default)]">
          <span className="text-[var(--text-faint)]">Tree depth:</span>
          <button
            onClick={() => updateDiffSettings({ treeDepth: Math.max(1, diffSettings.treeDepth - 1) })}
            className="p-1 hover:bg-[var(--surface-6)] text-[var(--text-primary)] rounded transition-colors"
            title="Decrease tree grouping depth"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-semibold text-[var(--text-primary)] px-1">{diffSettings.treeDepth}</span>
          <button
            onClick={() => updateDiffSettings({ treeDepth: Math.min(6, diffSettings.treeDepth + 1) })}
            className="p-1 hover:bg-[var(--surface-6)] text-[var(--text-primary)] rounded transition-colors"
            title="Increase tree grouping depth"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title="Toggle Color Theme"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--surface-4)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors"
        >
          {getThemeIcon()}
          <span>{getThemeLabel()}</span>
        </button>
      </div>
    </header>
  );
};
