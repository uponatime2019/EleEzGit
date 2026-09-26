import React, { useState, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { CommitBar } from './components/CommitBar';
import { RecentCommitHeader } from './components/RecentCommitHeader';
import { FileList } from './components/FileList';
import { DiffViewer } from './components/DiffViewer';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { PromptModal } from './components/PromptModal';
import { useApp } from './context/AppContext';

export const AppContent: React.FC = () => {
  const { selectedCommit, diffSettings, updateDiffSettings } = useApp();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sidebarWidthRef = useRef<number>(diffSettings.changesFilesWidth || 280);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = diffSettings.changesFilesWidth || 280;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(180, Math.min(600, startWidth + delta));
        sidebarWidthRef.current = newWidth;
        const el = document.getElementById('sidebar-container');
        if (el) el.style.width = `${newWidth}px`;
      };

      const onMouseUp = () => {
        setIsDragging(false);
        updateDiffSettings({ changesFilesWidth: sidebarWidthRef.current });
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [diffSettings.changesFilesWidth, updateDiffSettings]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--surface-1)] text-[var(--text-strong)]">
      {/* Header Toolbar */}
      <Header />

      {/* Commit Bar or Recent Commit Details */}
      {selectedCommit ? <RecentCommitHeader /> : <CommitBar />}

      {/* Main Content Area (Sidebar + Splitter + Diff Viewer) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <div
          id="sidebar-container"
          style={{ width: `${diffSettings.changesFilesWidth || 280}px` }}
          className="shrink-0 h-full flex flex-col"
        >
          <FileList />
        </div>

        {/* Resizable Splitter */}
        <div
          onMouseDown={startResize}
          className={`w-1 cursor-col-resize hover:bg-[var(--accent)] transition-colors shrink-0 bg-[var(--surface-5)] ${
            isDragging ? 'bg-[var(--accent)]' : ''
          }`}
          title="Drag to resize sidebar"
        />

        {/* Center Diff Viewer */}
        <div className="flex-1 h-full overflow-hidden">
          <DiffViewer />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Modals */}
      <SettingsModal />
      <ConfirmModal />
      <PromptModal />
    </div>
  );
};
