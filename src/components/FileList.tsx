import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  MoreHorizontal,
  Sparkles,
  FileCode,
  Folder,
  Trash2,
  RotateCcw,
  Ban,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import { GitFileStatus, GitFileGroup, GitCommitInfo } from '../types';
import { useApp } from '../context/AppContext';

export const FileList: React.FC = () => {
  const {
    unstagedFiles,
    stagedFiles,
    selectedFile,
    isStagedSelected,
    selectFile,
    stageFile,
    unstageFile,
    stageGroup,
    unstageGroup,
    resetFile,
    resetGroup,
    addToGitIgnore,
    instantAiCommitFile,
    promptCommitPushFile,
    promptCommitPushGroup,
    aiCommitGroup,
    aiCommitAllTrees,
    openFile,
    openFolder,
    copyFilePath,
    recentCommits,
    enterCommitMode,
    selectedCommit,
    commitFiles,
    diffSettings,
    expandedGroupKeys,
    toggleGroupExpand,
    showAllFiles,
    toggleShowAllFiles,
  } = useApp();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeGroupMenuKey, setActiveGroupMenuKey] = useState<string | null>(null);

  // Recent commits pagination (4 per page like EzGit)
  const [commitPage, setCommitPage] = useState<number>(0);
  const [showRecentCommits, setShowRecentCommits] = useState<boolean>(false);
  const commitsPerPage = 4;
  const totalCommitPages = Math.max(1, Math.ceil(recentCommits.length / commitsPerPage));
  const currentCommits = recentCommits.slice(
    commitPage * commitsPerPage,
    (commitPage + 1) * commitsPerPage
  );

  // Close menus when clicking outside
  React.useEffect(() => {
    const closeMenu = () => {
      setActiveMenuId(null);
      setActiveGroupMenuKey(null);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const getGroupKey = (filePath: string, depth: number): string => {
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length <= 1) return 'Root';
    return parts.slice(0, Math.min(depth, parts.length - 1)).join('/');
  };

  const groupFiles = (files: GitFileStatus[]): GitFileGroup[] => {
    const map = new Map<string, GitFileStatus[]>();
    for (const f of files) {
      const key = getGroupKey(f.cleanPath, diffSettings.treeDepth);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }

    const groups: GitFileGroup[] = [];
    for (const [key, items] of map.entries()) {
      const isExpanded = showAllFiles || expandedGroupKeys.has(key);
      const isUntrackedAll = items.every((i) => i.isUntracked);
      const seriousFiles = items.filter((i) => i.hasSeriousWarning);

      groups.push({
        key,
        items,
        totalCount: items.length,
        isExpanded,
        hasWarning: false,
        warningToolTip: '',
        hasSeriousWarning: seriousFiles.length > 0,
        seriousWarningToolTip:
          seriousFiles.length > 0
            ? `🚨 Serious Warning: Contains non-image file(s) > 800KB`
            : '',
        headerToolTip: key,
        isUntrackedAll,
      });
    }

    return groups;
  };

  const unstagedGroups = useMemo(
    () => groupFiles(unstagedFiles),
    [unstagedFiles, diffSettings.treeDepth, showAllFiles, expandedGroupKeys]
  );

  const stagedGroups = useMemo(
    () => groupFiles(stagedFiles),
    [stagedFiles, diffSettings.treeDepth, showAllFiles, expandedGroupKeys]
  );

  const commitGroups = useMemo(
    () => groupFiles(commitFiles),
    [commitFiles, diffSettings.treeDepth, showAllFiles, expandedGroupKeys]
  );

  const getStatusColor = (status: string) => {
    switch (status.trim()) {
      case 'M':
        return 'text-[var(--badge-modified-text)] bg-[var(--badge-modified-bg)]'; // Modified amber
      case 'A':
        return 'text-[var(--badge-added-text)] bg-[var(--badge-added-bg)]'; // Added green
      case 'D':
        return 'text-[var(--badge-deleted-text)] bg-[var(--badge-deleted-bg)]'; // Deleted red
      case '??':
        return 'text-[var(--badge-untracked-text)] bg-[var(--badge-untracked-bg)]'; // Untracked purple
      case 'U':
        return 'text-[var(--badge-conflict-text)] bg-[var(--badge-conflict-bg)]'; // Conflicted red
      default:
        return 'text-[var(--badge-info-text)] bg-[var(--badge-info-bg)]';
    }
  };

  const renderGroup = (group: GitFileGroup, isStaged: boolean, isCommitView = false) => {
    const displayItems = group.isExpanded ? group.items : group.items.slice(0, 10);
    const hasMore = group.totalCount > 10;

    return (
      <div key={group.key} className="mb-2">
        {/* Group Header */}
        <div className="flex items-center justify-between px-2 py-1 bg-[var(--surface-3)] rounded border border-[var(--border-subtle)] mb-1">
          <div className="flex items-center space-x-1.5 overflow-hidden">
            <span
              className="text-xs font-bold text-[var(--accent-text)] truncate max-w-[140px]"
              title={group.headerToolTip}
            >
              {group.key}
            </span>
            <span className="text-[10px] text-[var(--text-faint)]">({group.totalCount})</span>
            {group.hasSeriousWarning && (
              <span title={group.seriousWarningToolTip} className="text-xs cursor-help">
                🚨
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {hasMore && (
              <button
                onClick={() => toggleGroupExpand(group.key)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-5)] hover:bg-[var(--surface-7)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {group.isExpanded ? '▲ 10' : `▼ +${group.totalCount - 10}`}
              </button>
            )}

            {!isCommitView && (
              <>
                {isStaged ? (
                  <button
                    onClick={() => unstageGroup(group)}
                    title="Unstage all files in group"
                    className="flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-5)] hover:bg-[var(--surface-7)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Minus className="w-2.5 h-2.5" />
                    <span>Unstage</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => stageGroup(group)}
                      title="Stage all files in group"
                      className="flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-5)] hover:bg-[var(--surface-7)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Stage</span>
                    </button>
                    <button
                      onClick={() => aiCommitGroup(group)}
                      title="AI Commit and push this folder tree"
                      className="flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--selection)] hover:bg-[var(--selection-strong)] text-[var(--accent-text)]"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[var(--text-warning)]" />
                      <span>AI</span>
                    </button>
                  </>
                )}

                {/* Group dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGroupMenuKey(
                        activeGroupMenuKey === group.key ? null : group.key
                      );
                    }}
                    className="p-1 rounded hover:bg-[var(--surface-7)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>

                  {activeGroupMenuKey === group.key && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-2)] border border-[var(--border-default)] rounded shadow-xl py-1 z-50 text-xs"
                    >
                      {!isStaged && (
                        <>
                          <button
                            onClick={() => {
                              setActiveGroupMenuKey(null);
                              resetGroup(group);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] text-[var(--danger-text)] flex items-center space-x-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>🔄 Reset All</span>
                          </button>
                          {group.isUntrackedAll && (
                            <button
                              onClick={() => {
                                setActiveGroupMenuKey(null);
                                addToGitIgnore(group.key + '/');
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] text-[var(--text-secondary)] flex items-center space-x-2"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>🚫 Add to .gitignore</span>
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => {
                          setActiveGroupMenuKey(null);
                          promptCommitPushGroup(group);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] text-[var(--text-secondary)] flex items-center space-x-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                        <span>🚀 Commit &amp; Push</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* File items */}
        <div className="space-y-0.5">
          {displayItems.map((file) => {
            const isSelected =
              selectedFile?.filePath === file.filePath && isStagedSelected === isStaged;

            return (
              <div
                key={file.filePath}
                onClick={() => selectFile(file, isStaged)}
                className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
                    : 'hover:bg-[var(--surface-4)] text-[var(--text-secondary)]'
                }`}
              >
                {/* Status code + file info */}
                <div className="flex items-center space-x-2 overflow-hidden flex-1 pr-1">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded leading-none ${
                      isSelected
                        ? 'bg-[var(--overlay-soft)] text-[var(--text-primary)]'
                        : getStatusColor(file.displayStatus)
                    }`}
                  >
                    {file.displayStatus}
                  </span>

                  <div className="overflow-hidden leading-tight flex-1">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-medium truncate">{file.fileName}</span>
                      {file.hasSeriousWarning && (
                        <span title={file.seriousWarningToolTip} className="text-xs cursor-help">
                          🚨
                        </span>
                      )}
                    </div>
                    {file.folderPath && (
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-faint)]'
                        }`}
                      >
                        {file.folderPath}
                      </div>
                    )}
                  </div>
                </div>

                {/* File Action Buttons */}
                {!isCommitView && (
                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                    {isStaged ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          unstageFile(file);
                        }}
                        title="Unstage this file"
                        className="p-1 rounded hover:bg-black/20 text-[var(--text-primary)]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          stageFile(file);
                        }}
                        title="Stage this file"
                        className="p-1 rounded hover:bg-black/20 text-[var(--text-primary)]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}

                    {/* File Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(
                            activeMenuId === file.filePath ? null : file.filePath
                          );
                        }}
                        className="p-1 rounded hover:bg-black/20 text-[var(--text-primary)]"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </button>

                      {activeMenuId === file.filePath && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-52 bg-[var(--surface-2)] border border-[var(--border-default)] rounded shadow-xl py-1 z-50 text-xs text-[var(--text-secondary)]"
                        >
                          {!isStaged && (
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                resetFile(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] text-[var(--danger-text)] flex items-center space-x-2"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{file.isUntracked ? '🗑️ Delete' : '🔄️ Reset'}</span>
                            </button>
                          )}

                          {file.isUntracked && (
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                addToGitIgnore(file.cleanPath);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] flex items-center space-x-2"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>🚫 Add to .gitignore</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              copyFilePath(file);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] flex items-center space-x-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>📋 Copy File Path</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              openFile(file);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] flex items-center space-x-2"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>📝 Open File</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              openFolder(file);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] flex items-center space-x-2"
                          >
                            <Folder className="w-3.5 h-3.5" />
                            <span>📁 Open Folder</span>
                          </button>

                          {!isStaged && (
                            <>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  promptCommitPushFile(file);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] flex items-center space-x-2"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                                <span>🚀 Commit &amp; Push</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  instantAiCommitFile(file);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-5)] text-[var(--text-warning)] flex items-center space-x-2"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>✨ Instant AI Commit</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface-1)] border-r border-[var(--border-default)]">
      {/* Changes Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            {selectedCommit
              ? `Commit Files (${commitFiles.length})`
              : `Changes (${unstagedFiles.length + stagedFiles.length})`}
          </span>
          <button
            onClick={toggleShowAllFiles}
            className="text-[11px] text-[var(--accent-text)] hover:underline"
          >
            {showAllFiles ? 'Collapse Trees' : 'Show All'}
          </button>
        </div>

        {!selectedCommit && (
          <button
            onClick={() => aiCommitAllTrees()}
            title="AI commit each folder tree one by one until all changes are committed and pushed"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[var(--selection)] hover:bg-[var(--selection-strong)] text-[var(--accent-text)] text-[11px] font-semibold border border-[var(--selection-border)]"
          >
            <Sparkles className="w-3 h-3 text-[var(--text-warning)]" />
            <span>✨ Commit Trees</span>
          </button>
        )}
      </div>

      {/* Grouped Files List Container */}
      <div className="flex-1 overflow-y-auto p-2">
        {selectedCommit ? (
          commitGroups.length > 0 ? (
            commitGroups.map((g) => renderGroup(g, false, true))
          ) : (
            <div className="text-xs text-[var(--text-faint)] p-4 text-center">No files modified in this commit</div>
          )
        ) : (
          <>
            {/* Unstaged Changes Section */}
            {unstagedGroups.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-[var(--text-faint)] uppercase px-1 mb-1 tracking-wider">
                  Unstaged Changes ({unstagedFiles.length})
                </div>
                {unstagedGroups.map((g) => renderGroup(g, false))}
              </div>
            )}

            {/* Staged Section */}
            {stagedGroups.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[var(--badge-added-text)] uppercase px-1 mb-1 tracking-wider">
                  Staged Changes ({stagedFiles.length})
                </div>
                {stagedGroups.map((g) => renderGroup(g, true))}
              </div>
            )}

            {unstagedFiles.length === 0 && stagedFiles.length === 0 && (
              <div className="text-xs text-[var(--text-faint)] p-8 text-center flex flex-col items-center">
                <FileCode className="w-8 h-8 mb-2 opacity-40" />
                <span>Working tree is clean.</span>
                <span className="text-[11px] mt-1 text-[var(--text-ghost)]">No unstaged or staged changes.</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Commits Drawer Toggle */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-2)]">
        <button
          onClick={() => setShowRecentCommits(!showRecentCommits)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-4)] transition-colors"
        >
          <div className="flex items-center space-x-1.5">
            <History className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            <span>Recent Commits ({recentCommits.length})</span>
          </div>
          {showRecentCommits ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Collapsible Commit History Panel */}
        {showRecentCommits && (
          <div className="border-t border-[var(--border-subtle)] p-2 bg-[var(--surface-0)]">
            <div className="space-y-1.5 mb-2">
              {currentCommits.map((c) => (
                <div
                  key={c.hash}
                  onClick={() => enterCommitMode(c)}
                  className={`p-2 rounded cursor-pointer transition-colors border ${
                    selectedCommit?.hash === c.hash
                      ? 'bg-[var(--selection)] border-[var(--accent)]'
                      : 'bg-[var(--surface-1)] hover:bg-[var(--surface-3)] border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-faint)] mb-1">
                    <span className="font-mono text-[var(--syntax-green)] font-semibold">{c.shortHash}</span>
                    <span>{c.date}</span>
                  </div>
                  <div className="text-xs text-[var(--text-primary)] line-clamp-2">
                    {c.tagSection && (
                      <span className="font-bold text-[var(--accent-text)] mr-1">{c.tagSection}</span>
                    )}
                    <span>{c.messageSection}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-1 text-xs text-[var(--text-faint)]">
              <button
                disabled={commitPage === 0}
                onClick={() => setCommitPage((p) => Math.max(0, p - 1))}
                className="p-1 rounded hover:bg-[var(--surface-5)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {commitPage + 1} / {totalCommitPages}
              </span>
              <button
                disabled={commitPage >= totalCommitPages - 1}
                onClick={() => setCommitPage((p) => Math.min(totalCommitPages - 1, p + 1))}
                className="p-1 rounded hover:bg-[var(--surface-5)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
