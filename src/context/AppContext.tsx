import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  GitFileStatus,
  GitFileGroup,
  GitCommitInfo,
  AiSettings,
  DiffSettings,
  ImageDiffData,
} from '../types';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface PromptDialogState {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  onConfirm: (val: string) => void;
}

interface AppContextType {
  repoPath: string;
  setRepoPath: (path: string) => void;
  unstagedFiles: GitFileStatus[];
  stagedFiles: GitFileStatus[];
  selectedFile: GitFileStatus | null;
  isStagedSelected: boolean;
  diffText: string;
  imageDiff: ImageDiffData | null;
  isLoadingDiff: boolean;
  isOperating: boolean;
  statusMessage: { text: string; isError?: boolean };
  aiSettings: AiSettings;
  diffSettings: DiffSettings;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  confirmDialog: ConfirmDialogState | null;
  setConfirmDialog: (state: ConfirmDialogState | null) => void;
  promptDialog: PromptDialogState | null;
  setPromptDialog: (state: PromptDialogState | null) => void;
  recentCommits: GitCommitInfo[];
  isRecentCommitsOpen: boolean;
  setIsRecentCommitsOpen: (open: boolean) => void;
  selectedCommit: GitCommitInfo | null;
  commitFiles: GitFileStatus[];
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  expandedGroupKeys: Set<string>;
  showAllFiles: boolean;
  toggleGroupExpand: (key: string) => void;
  toggleShowAllFiles: () => void;

  // Actions
  refreshData: (force?: boolean) => Promise<void>;
  selectFile: (file: GitFileStatus | null, staged?: boolean) => void;
  enterCommitMode: (commit: GitCommitInfo) => Promise<void>;
  exitCommitMode: () => void;
  stageFile: (file: GitFileStatus) => Promise<void>;
  unstageFile: (file: GitFileStatus) => Promise<void>;
  stageGroup: (group: GitFileGroup) => Promise<void>;
  unstageGroup: (group: GitFileGroup) => Promise<void>;
  resetFile: (file: GitFileStatus) => Promise<void>;
  resetGroup: (group: GitFileGroup) => Promise<void>;
  resetAll: () => Promise<void>;
  addToGitIgnore: (entry: string) => Promise<void>;
  commitAndPush: (customMessage?: string) => Promise<void>;
  aiCommitAndPush: () => Promise<void>;
  aiCommitGroup: (group: GitFileGroup) => Promise<void>;
  aiCommitAllTrees: () => Promise<void>;
  instantAiCommitFile: (file: GitFileStatus) => Promise<void>;
  promptCommitPushFile: (file: GitFileStatus) => void;
  promptCommitPushGroup: (group: GitFileGroup) => void;
  gitPull: () => Promise<void>;
  gitPush: () => Promise<void>;
  gitSync: () => Promise<void>;
  updateDiffSettings: (partial: Partial<DiffSettings>) => Promise<void>;
  updateAiSettings: (settings: AiSettings) => Promise<void>;
  openFile: (file: GitFileStatus) => void;
  openFolder: (file: GitFileStatus) => void;
  copyFilePath: (file: GitFileStatus) => void;
  copyText: (text: string) => void;
  setStatus: (text: string, isError?: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [repoPath, setRepoPath] = useState<string>('');
  const [unstagedFiles, setUnstagedFiles] = useState<GitFileStatus[]>([]);
  const [stagedFiles, setStagedFiles] = useState<GitFileStatus[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitFileStatus | null>(null);
  const [isStagedSelected, setIsStagedSelected] = useState<boolean>(false);
  const [diffText, setDiffText] = useState<string>('');
  const [imageDiff, setImageDiff] = useState<ImageDiffData | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);
  const [isOperating, setIsOperating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean }>({ text: 'Ready' });

  const [aiSettings, setAiSettings] = useState<AiSettings>({
    apiUrl: 'https://api.deepseek.com/chat/completions',
    apiKey: '',
    model: 'deepseek-chat',
    prefixMode: 'AutoFolder',
    customPrefix: '',
    repositoryPath: '',
  });

  const [diffSettings, setDiffSettings] = useState<DiffSettings>({
    fontSize: 12,
    fontFamily: 'Cascadia Code',
    changesFilesWidth: 280,
    treeDepth: 2,
    hideChangesWhenStaged: true,
    isSingleDiffView: false,
    theme: 'system',
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState | null>(null);

  const [recentCommits, setRecentCommits] = useState<GitCommitInfo[]>([]);
  const [isRecentCommitsOpen, setIsRecentCommitsOpen] = useState<boolean>(false);
  const [selectedCommit, setSelectedCommit] = useState<GitCommitInfo | null>(null);
  const [commitFiles, setCommitFiles] = useState<GitFileStatus[]>([]);

  const [commitMessage, setCommitMessage] = useState<string>('');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());
  const [showAllFiles, setShowAllFiles] = useState<boolean>(false);

  const setStatus = useCallback((text: string, isError = false) => {
    setStatusMessage({ text, isError });
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const ai = await window.electronAPI.loadAiSettings();
      const diff = await window.electronAPI.loadDiffSettings();
      setAiSettings(ai);
      setDiffSettings(diff);
      return { ai, diff };
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const loadDiff = useCallback(
    async (file: GitFileStatus | null, staged: boolean, commitHash?: string) => {
      if (!repoPath) return;
      setIsLoadingDiff(true);

      try {
        if (!file) {
          if (diffSettings.isSingleDiffView) {
            const allDiff = await window.electronAPI.getAllDiff(repoPath, staged);
            setDiffText(allDiff);
            setImageDiff(null);
          } else {
            setDiffText('(No file selected)');
            setImageDiff(null);
          }
          return;
        }

        if (file.isImage) {
          const imgData = await window.electronAPI.getImageDiff(repoPath, file.filePath, staged, commitHash);
          setImageDiff(imgData);
          setDiffText('');
        } else {
          setImageDiff(null);
          if (commitHash) {
            const res = await window.electronAPI.getCommitFileDiff(repoPath, commitHash, file.filePath);
            setDiffText(res);
          } else {
            const res = await window.electronAPI.getFileDiff(repoPath, file.filePath, staged);
            setDiffText(res);
          }
        }
      } catch (err: any) {
        setDiffText(`Error loading diff: ${err.message}`);
        setImageDiff(null);
      } finally {
        setIsLoadingDiff(false);
      }
    },
    [repoPath, diffSettings.isSingleDiffView]
  );

  const refreshData = useCallback(
    async (force = false) => {
      if (!repoPath) return;
      setStatus('Refreshing repository status...');

      try {
        const { unstaged, staged } = await window.electronAPI.getGitStatus(repoPath);
        setUnstagedFiles(unstaged);
        setStagedFiles(staged);

        // Load commits
        const commits = await window.electronAPI.getRecentCommits(repoPath, 50);
        setRecentCommits(commits);

        // Keep or select file
        if (!selectedCommit) {
          if (selectedFile) {
            const list = isStagedSelected ? staged : unstaged;
            const match = list.find((f) => f.filePath === selectedFile.filePath);
            if (match) {
              setSelectedFile(match);
              await loadDiff(match, isStagedSelected);
            } else if (list.length > 0) {
              setSelectedFile(list[0]);
              await loadDiff(list[0], isStagedSelected);
            } else {
              const otherList = isStagedSelected ? unstaged : staged;
              if (otherList.length > 0) {
                setIsStagedSelected(!isStagedSelected);
                setSelectedFile(otherList[0]);
                await loadDiff(otherList[0], !isStagedSelected);
              } else {
                setSelectedFile(null);
                setDiffText('(Working tree clean)');
                setImageDiff(null);
              }
            }
          } else {
            if (unstaged.length > 0) {
              setSelectedFile(unstaged[0]);
              setIsStagedSelected(false);
              await loadDiff(unstaged[0], false);
            } else if (staged.length > 0) {
              setSelectedFile(staged[0]);
              setIsStagedSelected(true);
              await loadDiff(staged[0], true);
            } else {
              setDiffText('(Working tree clean)');
              setImageDiff(null);
            }
          }
        }

        setStatus('Ready');
      } catch (err: any) {
        setStatus(`Error refreshing status: ${err.message}`, true);
      }
    },
    [repoPath, selectedCommit, selectedFile, isStagedSelected, loadDiff, setStatus]
  );

  // Initialize repository
  useEffect(() => {
    (async () => {
      const settings = await loadSettings();
      let detected = settings?.ai.repositoryPath;
      if (!detected) {
        detected = await window.electronAPI.detectRepo();
      }
      setRepoPath(detected);
    })();
  }, [loadSettings]);

  const refreshDataRef = useRef(refreshData);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  useEffect(() => {
    if (repoPath) {
      refreshDataRef.current();
    }
  }, [repoPath]);

  // Window focus auto-refresh
  useEffect(() => {
    const onFocus = () => {
      if (repoPath && !isOperating && !selectedCommit) {
        refreshDataRef.current();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [repoPath, isOperating, selectedCommit]);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (diffSettings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (diffSettings.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }, [diffSettings.theme]);

  const selectFile = (file: GitFileStatus | null, staged = false) => {
    setSelectedFile(file);
    setIsStagedSelected(staged);
    loadDiff(file, staged, selectedCommit?.hash);
  };

  const enterCommitMode = async (commit: GitCommitInfo) => {
    setSelectedCommit(commit);
    setIsRecentCommitsOpen(false);
    setStatus(`Inspecting commit ${commit.shortHash}...`);
    try {
      const files = await window.electronAPI.getCommitFiles(repoPath, commit.hash);
      setCommitFiles(files);
      if (files.length > 0) {
        setSelectedFile(files[0]);
        await loadDiff(files[0], false, commit.hash);
      } else {
        setSelectedFile(null);
        const diff = await window.electronAPI.getCommitDiff(repoPath, commit.hash);
        setDiffText(diff);
        setImageDiff(null);
      }
    } catch (err: any) {
      setStatus(`Failed to inspect commit: ${err.message}`, true);
    }
  };

  const exitCommitMode = () => {
    setSelectedCommit(null);
    setCommitFiles([]);
    refreshData();
  };

  const stageFile = async (file: GitFileStatus) => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus(`Staging ${file.fileName}...`);
    try {
      await window.electronAPI.stageFile(repoPath, file.filePath);
      await refreshData();
    } finally {
      setIsOperating(false);
    }
  };

  const unstageFile = async (file: GitFileStatus) => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus(`Unstaging ${file.fileName}...`);
    try {
      await window.electronAPI.unstageFile(repoPath, file.filePath);
      await refreshData();
    } finally {
      setIsOperating(false);
    }
  };

  const stageGroup = async (group: GitFileGroup) => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus(`Staging all files in [${group.key}]...`);
    try {
      const paths = group.items.map((i) => i.filePath);
      await window.electronAPI.stageFiles(repoPath, paths);
      await refreshData();
    } finally {
      setIsOperating(false);
    }
  };

  const unstageGroup = async (group: GitFileGroup) => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus(`Unstaging all files in [${group.key}]...`);
    try {
      const paths = group.items.map((i) => i.filePath);
      await window.electronAPI.unstageFiles(repoPath, paths);
      await refreshData();
    } finally {
      setIsOperating(false);
    }
  };

  const resetFile = async (file: GitFileStatus) => {
    if (isOperating) return;
    setConfirmDialog({
      isOpen: true,
      title: file.isUntracked ? 'Confirm Delete Untracked File' : 'Confirm Reset File',
      message: `Are you sure you want to ${file.isUntracked ? 'permanently delete' : 'reset'} "${file.cleanPath}"? This cannot be undone.`,
      onConfirm: async () => {
        setIsOperating(true);
        setStatus(`Resetting ${file.fileName}...`);
        try {
          await window.electronAPI.resetFile(repoPath, file.filePath, file.isUntracked);
          await refreshData();
        } finally {
          setIsOperating(false);
        }
      },
    });
  };

  const resetGroup = async (group: GitFileGroup) => {
    if (isOperating) return;
    setConfirmDialog({
      isOpen: true,
      title: `Reset All in [${group.key}]`,
      message: `Are you sure you want to reset and discard all ${group.totalCount} file(s) in "${group.key}"? This cannot be undone.`,
      onConfirm: async () => {
        setIsOperating(true);
        setStatus(`Resetting files in [${group.key}]...`);
        try {
          for (const item of group.items) {
            await window.electronAPI.resetFile(repoPath, item.filePath, item.isUntracked);
          }
          await refreshData();
        } finally {
          setIsOperating(false);
        }
      },
    });
  };

  const resetAll = async () => {
    if (isOperating) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Reset All Changes',
      message: 'Are you sure you want to discard ALL working tree changes and untracked files? This operation is permanent.',
      onConfirm: async () => {
        setIsOperating(true);
        setStatus('Resetting all changes...');
        try {
          await window.electronAPI.resetAll(repoPath);
          await refreshData();
          setStatus('All changes reset successfully.');
        } finally {
          setIsOperating(false);
        }
      },
    });
  };

  const addToGitIgnore = async (entry: string) => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus(`Adding "${entry}" to .gitignore...`);
    try {
      await window.electronAPI.addToGitIgnore(repoPath, entry);
      await refreshData();
      setStatus(`Added "${entry}" to .gitignore.`);
    } finally {
      setIsOperating(false);
    }
  };

  const commitAndPush = async (customMessage?: string) => {
    if (isOperating) return;
    const msg = customMessage || commitMessage.trim();
    if (!msg) {
      setStatus('Commit message cannot be empty.', true);
      return;
    }

    setIsOperating(true);
    setStatus('Preparing commit...');
    try {
      // If no staged files, stage all changed files
      if (stagedFiles.length === 0) {
        setStatus('Staging all files...');
        const paths = unstagedFiles.map((f) => f.filePath);
        if (paths.length > 0) {
          await window.electronAPI.stageFiles(repoPath, paths);
        }
      }

      setStatus('Committing changes...');
      const commitRes = await window.electronAPI.commit(repoPath, msg);
      if (commitRes.exitCode !== 0) {
        setStatus(`Commit failed: ${commitRes.error || commitRes.output}`, true);
        return;
      }

      setCommitMessage('');
      setStatus('Pushing to remote...');
      const pushRes = await window.electronAPI.executePushWithAutoPull(repoPath);
      if (pushRes.exitCode !== 0) {
        setStatus(`Push failed: ${pushRes.error || pushRes.output}`, true);
      } else {
        setStatus('Commit & Push succeeded!');
      }

      await refreshData();
    } catch (err: any) {
      setStatus(`Error: ${err.message}`, true);
    } finally {
      setIsOperating(false);
    }
  };

  const aiCommitAndPush = async () => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus('Analyzing changes for AI commit...');
    try {
      const diff = await window.electronAPI.getAllDiff(repoPath, stagedFiles.length > 0);
      const allFiles = [...stagedFiles, ...unstagedFiles].map((f) => f.filePath);
      const pathTag = await window.electronAPI.buildPathTag(allFiles);

      setStatus('Generating AI commit message...');
      const generatedMsg = await window.electronAPI.generateAiCommitMessage(diff, pathTag, aiSettings);

      setCommitMessage(generatedMsg);
      setStatus(`Generated commit message: "${generatedMsg}". Committing & pushing...`);

      // Execute commit & push
      if (stagedFiles.length === 0) {
        const paths = unstagedFiles.map((f) => f.filePath);
        if (paths.length > 0) {
          await window.electronAPI.stageFiles(repoPath, paths);
        }
      }

      const commitRes = await window.electronAPI.commit(repoPath, generatedMsg);
      if (commitRes.exitCode !== 0) {
        setStatus(`Commit failed: ${commitRes.error || commitRes.output}`, true);
        return;
      }

      setCommitMessage('');
      setStatus('Pushing to remote...');
      const pushRes = await window.electronAPI.executePushWithAutoPull(repoPath);
      if (pushRes.exitCode !== 0) {
        setStatus(`Push failed: ${pushRes.error || pushRes.output}`, true);
      } else {
        setStatus('AI Commit & Push succeeded!');
      }

      await refreshData();
    } catch (err: any) {
      setStatus(`AI Commit failed: ${err.message}`, true);
    } finally {
      setIsOperating(false);
    }
  };

  const aiCommitGroup = async (group: GitFileGroup) => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus(`Staging files in [${group.key}]...`);
    try {
      const paths = group.items.map((i) => i.filePath);
      await window.electronAPI.stageFiles(repoPath, paths);

      setStatus(`Generating AI message for [${group.key}]...`);
      let combinedDiff = '';
      for (const item of group.items) {
        const d = await window.electronAPI.getFileDiff(repoPath, item.filePath, true);
        combinedDiff += '\n' + d;
      }

      const pathTag = await window.electronAPI.buildPathTag(paths);
      const msg = await window.electronAPI.generateAiCommitMessage(combinedDiff, pathTag, aiSettings);

      setStatus(`Committing [${group.key}]: "${msg}"...`);
      const commitRes = await window.electronAPI.commit(repoPath, msg);
      if (commitRes.exitCode !== 0) {
        setStatus(`Commit failed: ${commitRes.error || commitRes.output}`, true);
        return;
      }

      setStatus(`Pushing [${group.key}] to remote...`);
      const pushRes = await window.electronAPI.executePushWithAutoPull(repoPath);
      if (pushRes.exitCode !== 0) {
        setStatus(`Push failed: ${pushRes.error || pushRes.output}`, true);
      } else {
        setStatus(`Group [${group.key}] committed & pushed!`);
      }

      await refreshData();
    } catch (err: any) {
      setStatus(`Group AI Commit failed: ${err.message}`, true);
    } finally {
      setIsOperating(false);
    }
  };

  const aiCommitAllTrees = async () => {
    if (isOperating) return;
    setStatus('Preparing to AI commit all folder trees...');

    // Group unstaged and staged files
    const groupsMap = new Map<string, GitFileStatus[]>();
    for (const f of [...unstagedFiles, ...stagedFiles]) {
      const parts = f.cleanPath.split('/');
      const key = parts.length > 1 ? parts.slice(0, Math.min(diffSettings.treeDepth, parts.length - 1)).join('/') : 'Root';
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(f);
    }

    const groupKeys = Array.from(groupsMap.keys());
    if (groupKeys.length === 0) {
      setStatus('No changes to commit.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Commit All Trees with AI',
      message: `This will sequentially generate AI commit messages, commit, and push each of the ${groupKeys.length} folder tree group(s) one by one. Continue?`,
      onConfirm: async () => {
        setIsOperating(true);
        try {
          for (let i = 0; i < groupKeys.length; i++) {
            const key = groupKeys[i];
            const items = groupsMap.get(key)!;
            setStatus(`Processing tree ${i + 1}/${groupKeys.length}: [${key}]...`);

            const paths = items.map((f) => f.filePath);
            await window.electronAPI.stageFiles(repoPath, paths);

            let combinedDiff = '';
            for (const item of items) {
              const d = await window.electronAPI.getFileDiff(repoPath, item.filePath, true);
              combinedDiff += '\n' + d;
            }

            const pathTag = await window.electronAPI.buildPathTag(paths);
            const msg = await window.electronAPI.generateAiCommitMessage(combinedDiff, pathTag, aiSettings);

            setStatus(`Committing [${key}]: ${msg}...`);
            const commitRes = await window.electronAPI.commit(repoPath, msg);
            if (commitRes.exitCode !== 0) {
              setStatus(`Commit failed on [${key}]: ${commitRes.error || commitRes.output}`, true);
              break;
            }

            setStatus(`Pushing [${key}]...`);
            const pushRes = await window.electronAPI.executePushWithAutoPull(repoPath);
            if (pushRes.exitCode !== 0) {
              setStatus(`Push failed on [${key}]: ${pushRes.error || pushRes.output}`, true);
              break;
            }
          }
          setStatus('All trees committed and pushed successfully!');
          await refreshData();
        } catch (err: any) {
          setStatus(`Error during commit all trees: ${err.message}`, true);
        } finally {
          setIsOperating(false);
        }
      },
    });
  };

  const instantAiCommitFile = async (file: GitFileStatus) => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus(`Instant AI committing ${file.fileName}...`);
    try {
      await window.electronAPI.stageFile(repoPath, file.filePath);
      const diff = await window.electronAPI.getFileDiff(repoPath, file.filePath, true);
      const pathTag = await window.electronAPI.buildPathTag([file.filePath]);
      const msg = await window.electronAPI.generateAiCommitMessage(diff, pathTag, aiSettings);

      setStatus(`Committing "${msg}"...`);
      const commitRes = await window.electronAPI.commit(repoPath, msg);
      if (commitRes.exitCode !== 0) {
        setStatus(`Commit failed: ${commitRes.error || commitRes.output}`, true);
        return;
      }

      setStatus(`Pushing ${file.fileName}...`);
      const pushRes = await window.electronAPI.executePushWithAutoPull(repoPath);
      if (pushRes.exitCode !== 0) {
        setStatus(`Push failed: ${pushRes.error || pushRes.output}`, true);
      } else {
        setStatus(`File ${file.fileName} committed & pushed!`);
      }

      await refreshData();
    } catch (err: any) {
      setStatus(`Instant AI commit failed: ${err.message}`, true);
    } finally {
      setIsOperating(false);
    }
  };

  const promptCommitPushFile = (file: GitFileStatus) => {
    setPromptDialog({
      isOpen: true,
      title: `Commit & Push: ${file.fileName}`,
      placeholder: 'Enter commit message...',
      onConfirm: async (msg) => {
        if (!msg.trim()) return;
        setIsOperating(true);
        setStatus(`Staging & committing ${file.fileName}...`);
        try {
          await window.electronAPI.stageFile(repoPath, file.filePath);
          const commitRes = await window.electronAPI.commit(repoPath, msg.trim());
          if (commitRes.exitCode !== 0) {
            setStatus(`Commit failed: ${commitRes.error || commitRes.output}`, true);
            return;
          }
          const pushRes = await window.electronAPI.executePushWithAutoPull(repoPath);
          if (pushRes.exitCode !== 0) {
            setStatus(`Push failed: ${pushRes.error || pushRes.output}`, true);
          } else {
            setStatus(`Committed and pushed ${file.fileName}!`);
          }
          await refreshData();
        } finally {
          setIsOperating(false);
        }
      },
    });
  };

  const promptCommitPushGroup = (group: GitFileGroup) => {
    setPromptDialog({
      isOpen: true,
      title: `Commit & Push: [${group.key}]`,
      placeholder: 'Enter commit message...',
      onConfirm: async (msg) => {
        if (!msg.trim()) return;
        setIsOperating(true);
        setStatus(`Staging & committing [${group.key}]...`);
        try {
          const paths = group.items.map((i) => i.filePath);
          await window.electronAPI.stageFiles(repoPath, paths);
          const commitRes = await window.electronAPI.commit(repoPath, msg.trim());
          if (commitRes.exitCode !== 0) {
            setStatus(`Commit failed: ${commitRes.error || commitRes.output}`, true);
            return;
          }
          const pushRes = await window.electronAPI.executePushWithAutoPull(repoPath);
          if (pushRes.exitCode !== 0) {
            setStatus(`Push failed: ${pushRes.error || pushRes.output}`, true);
          } else {
            setStatus(`Committed and pushed [${group.key}]!`);
          }
          await refreshData();
        } finally {
          setIsOperating(false);
        }
      },
    });
  };

  const gitPull = async () => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus('Running Git Pull...');
    try {
      const res = await window.electronAPI.pull(repoPath);
      if (res.exitCode === 0) {
        setStatus('Git Pull completed successfully.');
      } else {
        setStatus(`Git Pull failed: ${res.error || res.output}`, true);
      }
      await refreshData();
    } finally {
      setIsOperating(false);
    }
  };

  const gitPush = async () => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus('Running Git Push...');
    try {
      const res = await window.electronAPI.executePushWithAutoPull(repoPath);
      if (res.exitCode === 0) {
        setStatus('Git Push completed successfully.');
      } else {
        setStatus(`Git Push failed: ${res.error || res.output}`, true);
      }
      await refreshData();
    } finally {
      setIsOperating(false);
    }
  };

  const gitSync = async () => {
    if (isOperating) return;
    setIsOperating(true);
    setStatus('Running Git Sync (Pull & Push)...');
    try {
      const syncRes = await window.electronAPI.sync(repoPath);
      if (syncRes.pullResult.exitCode !== 0) {
        setStatus(`Sync failed on Pull: ${syncRes.pullResult.error || syncRes.pullResult.output}`, true);
      } else if (syncRes.pushResult && syncRes.pushResult.exitCode !== 0) {
        setStatus(`Sync failed on Push: ${syncRes.pushResult.error || syncRes.pushResult.output}`, true);
      } else {
        setStatus('Git Sync completed successfully!');
      }
      await refreshData();
    } finally {
      setIsOperating(false);
    }
  };

  const updateDiffSettings = async (partial: Partial<DiffSettings>) => {
    const updated = { ...diffSettings, ...partial };
    setDiffSettings(updated);
    await window.electronAPI.saveDiffSettings(updated);
  };

  const updateAiSettings = async (newSettings: AiSettings) => {
    setAiSettings(newSettings);
    await window.electronAPI.saveAiSettings(newSettings);
  };

  const openFile = (file: GitFileStatus) => {
    window.electronAPI.openFile(repoPath, file.filePath);
  };

  const openFolder = (file: GitFileStatus) => {
    window.electronAPI.openFolder(repoPath, file.filePath);
  };

  const copyFilePath = (file: GitFileStatus) => {
    window.electronAPI.copyToClipboard(file.cleanPath);
    setStatus(`Copied path: ${file.cleanPath}`);
  };

  const copyText = (text: string) => {
    window.electronAPI.copyToClipboard(text);
    setStatus(`Copied to clipboard!`);
  };

  const toggleGroupExpand = (key: string) => {
    const next = new Set(expandedGroupKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedGroupKeys(next);
  };

  const toggleShowAllFiles = () => {
    setShowAllFiles((prev) => !prev);
  };

  return (
    <AppContext.Provider
      value={{
        repoPath,
        setRepoPath,
        unstagedFiles,
        stagedFiles,
        selectedFile,
        isStagedSelected,
        diffText,
        imageDiff,
        isLoadingDiff,
        isOperating,
        statusMessage,
        aiSettings,
        diffSettings,
        isSettingsOpen,
        setIsSettingsOpen,
        confirmDialog,
        setConfirmDialog,
        promptDialog,
        setPromptDialog,
        recentCommits,
        isRecentCommitsOpen,
        setIsRecentCommitsOpen,
        selectedCommit,
        commitFiles,
        commitMessage,
        setCommitMessage,
        expandedGroupKeys,
        showAllFiles,
        toggleGroupExpand,
        toggleShowAllFiles,
        refreshData,
        selectFile,
        enterCommitMode,
        exitCommitMode,
        stageFile,
        unstageFile,
        stageGroup,
        unstageGroup,
        resetFile,
        resetGroup,
        resetAll,
        addToGitIgnore,
        commitAndPush,
        aiCommitAndPush,
        aiCommitGroup,
        aiCommitAllTrees,
        instantAiCommitFile,
        promptCommitPushFile,
        promptCommitPushGroup,
        gitPull,
        gitPush,
        gitSync,
        updateDiffSettings,
        updateAiSettings,
        openFile,
        openFolder,
        copyFilePath,
        copyText,
        setStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
