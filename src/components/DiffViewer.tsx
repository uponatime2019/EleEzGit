import React, { useMemo } from 'react';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ImagePreview } from './ImagePreview';

const FONT_FAMILIES = [
  'Cascadia Code',
  'Consolas',
  'JetBrains Mono',
  'Fira Code',
  'Courier New',
  'monospace',
];

export const DiffViewer: React.FC = () => {
  const {
    diffText,
    imageDiff,
    isLoadingDiff,
    diffSettings,
    updateDiffSettings,
    selectedFile,
    isStagedSelected,
    refreshData,
  } = useApp();

  const handleFontDec = () => {
    updateDiffSettings({ fontSize: Math.max(9, diffSettings.fontSize - 1) });
  };

  const handleFontInc = () => {
    updateDiffSettings({ fontSize: Math.min(24, diffSettings.fontSize + 1) });
  };

  const handleFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateDiffSettings({ fontFamily: e.target.value });
  };

  const handleSingleDiffToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDiffSettings({ isSingleDiffView: e.target.checked });
  };

  // Parse diff lines with classification
  const parsedLines = useMemo(() => {
    if (!diffText) return [];
    return diffText.split(/\r?\n/).map((line, index) => {
      let type: 'add' | 'del' | 'hunk' | 'meta' | 'normal' = 'normal';

      if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file')) {
        type = 'meta';
      } else if (line.startsWith('@@')) {
        type = 'hunk';
      } else if (line.startsWith('+')) {
        type = 'add';
      } else if (line.startsWith('-')) {
        type = 'del';
      }

      return { line, type, key: index };
    });
  }, [diffText]);

  return (
    <div className="flex flex-col h-full bg-[var(--surface-0)] overflow-hidden">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] text-xs">
        <div className="flex items-center space-x-2">
          {selectedFile ? (
            <span className="font-semibold text-[var(--text-primary)] truncate max-w-[400px]">
              {selectedFile.cleanPath}
              <span className="text-[var(--text-faint)] font-normal ml-2">
                ({isStagedSelected ? 'Staged' : 'Working Tree'})
              </span>
            </span>
          ) : (
            <span className="text-[var(--text-faint)]">
              {diffSettings.isSingleDiffView ? 'Unified Working Tree Diff' : 'No file selected'}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-[var(--text-muted)]">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleFontDec}
              title="Decrease Font Size"
              className="px-2 py-0.5 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-6)] text-[var(--text-primary)] border border-[var(--border-default)]"
            >
              A-
            </button>
            <span className="w-8 text-center text-xs font-mono">{diffSettings.fontSize}px</span>
            <button
              onClick={handleFontInc}
              title="Increase Font Size"
              className="px-2 py-0.5 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-6)] text-[var(--text-primary)] border border-[var(--border-default)]"
            >
              A+
            </button>
          </div>

          {/* Font Family */}
          <select
            value={diffSettings.fontFamily}
            onChange={handleFamilyChange}
            className="px-2 py-1 rounded bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs focus:outline-none"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Single Diff View checkbox */}
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={diffSettings.isSingleDiffView}
              onChange={handleSingleDiffToggle}
              className="w-3.5 h-3.5 rounded bg-[var(--surface-3)] border-[var(--border-strong)] text-[var(--accent)] focus:ring-0 cursor-pointer"
            />
            <span>Single Diff View</span>
          </label>
        </div>
      </div>

      {/* Main Diff Content */}
      <div className="flex-1 overflow-auto relative">
        {isLoadingDiff ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--scrim)] backdrop-blur-[1px] z-10">
            <div className="flex items-center space-x-2 text-sm text-[var(--accent-text)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading diff...</span>
            </div>
          </div>
        ) : null}

        {imageDiff ? (
          <ImagePreview data={imageDiff} />
        ) : (
          <div
            className="p-3 select-text whitespace-pre leading-relaxed"
            style={{
              fontFamily: diffSettings.fontFamily,
              fontSize: `${diffSettings.fontSize}px`,
            }}
          >
            {parsedLines.map(({ line, type, key }) => {
              let className = 'py-0.5 px-2 block rounded-[1px] font-mono ';
              if (type === 'add') className += 'diff-line-add ';
              else if (type === 'del') className += 'diff-line-del ';
              else if (type === 'hunk') className += 'diff-line-hunk font-bold my-1 ';
              else if (type === 'meta') className += 'diff-line-meta font-semibold ';
              else className += 'text-[var(--text-dim)] hover:bg-[var(--row-hover)]';

              return (
                <div key={key} className={className}>
                  {line || ' '}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
