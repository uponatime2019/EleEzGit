export type GitPrefixMode = 'AutoFolder' | 'Custom' | 'Both' | 'None';

export interface DiffSettings {
  fontSize: number;
  fontFamily: string;
  changesFilesWidth: number;
  treeDepth: number;
  hideChangesWhenStaged: boolean;
  isSingleDiffView: boolean;
  theme: 'system' | 'dark' | 'light';
}

export interface AiSettings {
  apiUrl: string;
  apiKey: string;
  model: string;
  prefixMode: GitPrefixMode;
  customPrefix: string;
  repositoryPath: string;
}

export interface GitFileStatus {
  statusCode: string;
  filePath: string;
  displayStatus: string;
  displayPath: string;
  cleanPath: string;
  fileName: string;
  folderPath: string;
  isUntracked: boolean;
  isStaged: boolean;
  hasUnstagedChanges: boolean;
  isModified: boolean;
  isAdded: boolean;
  isDeleted: boolean;
  isConflicted: boolean;
  isImage: boolean;
  fileSizeBytes: number;
  hasSeriousWarning: boolean;
  seriousWarningToolTip: string;
}

export interface GitFileGroup {
  key: string;
  items: GitFileStatus[];
  totalCount: number;
  isExpanded: boolean;
  hasWarning: boolean;
  warningToolTip: string;
  hasSeriousWarning: boolean;
  seriousWarningToolTip: string;
  headerToolTip: string;
  isUntrackedAll: boolean;
}

export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  tagSection: string;
  messageSection: string;
  date: string;
  author: string;
}

export interface GitCommandResult {
  exitCode: number;
  output: string;
  error: string;
}

export interface ImageDiffData {
  hasBefore: boolean;
  hasAfter: boolean;
  beforeDataUrl?: string;
  afterDataUrl?: string;
  beforeSize?: number;
  afterSize?: number;
  fileName: string;
}

export interface ElectronAPI {
  // Repository
  detectRepo: () => Promise<string>;
  browseRepo: () => Promise<string | null>;
  getGitStatus: (repoPath: string) => Promise<{ unstaged: GitFileStatus[]; staged: GitFileStatus[] }>;

  // Diffs
  getFileDiff: (repoPath: string, filePath: string, staged: boolean) => Promise<string>;
  getAllDiff: (repoPath: string, staged: boolean) => Promise<string>;
  getCommitDiff: (repoPath: string, commitHash: string) => Promise<string>;
  getCommitFileDiff: (repoPath: string, commitHash: string, filePath: string) => Promise<string>;
  getImageDiff: (repoPath: string, filePath: string, staged: boolean, commitHash?: string) => Promise<ImageDiffData>;

  // Operations
  stageFile: (repoPath: string, filePath: string) => Promise<GitCommandResult>;
  unstageFile: (repoPath: string, filePath: string) => Promise<GitCommandResult>;
  stageFiles: (repoPath: string, filePaths: string[]) => Promise<GitCommandResult>;
  unstageFiles: (repoPath: string, filePaths: string[]) => Promise<GitCommandResult>;
  resetFile: (repoPath: string, filePath: string, isUntracked: boolean) => Promise<GitCommandResult>;
  resetAll: (repoPath: string) => Promise<GitCommandResult>;
  addToGitIgnore: (repoPath: string, pattern: string) => Promise<boolean>;
  commit: (repoPath: string, message: string) => Promise<GitCommandResult>;
  push: (repoPath: string) => Promise<GitCommandResult>;
  pull: (repoPath: string) => Promise<GitCommandResult>;
  sync: (repoPath: string) => Promise<{ pullResult: GitCommandResult; pushResult?: GitCommandResult }>;
  executePushWithAutoPull: (repoPath: string) => Promise<GitCommandResult>;

  // Commit history
  getRecentCommits: (repoPath: string, count?: number) => Promise<GitCommitInfo[]>;
  getCommitFiles: (repoPath: string, commitHash: string) => Promise<GitFileStatus[]>;

  // Shell / File
  openFile: (repoPath: string, filePath: string) => Promise<boolean>;
  openFolder: (repoPath: string, filePath: string) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<void>;

  // Settings
  loadAiSettings: () => Promise<AiSettings>;
  saveAiSettings: (settings: AiSettings) => Promise<void>;
  loadDiffSettings: () => Promise<DiffSettings>;
  saveDiffSettings: (settings: DiffSettings) => Promise<void>;

  // AI
  testAiConnection: (settings: AiSettings) => Promise<string>;
  generateAiCommitMessage: (diff: string, pathTag: string, settings?: AiSettings) => Promise<string>;
  buildPathTag: (changedFiles: string[]) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
