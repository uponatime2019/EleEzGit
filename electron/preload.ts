import { contextBridge, ipcRenderer } from 'electron';
import { AiSettings, DiffSettings, ElectronAPI } from '../src/types';

const api: ElectronAPI = {
  detectRepo: () => ipcRenderer.invoke('git:detectRepo'),
  browseRepo: () => ipcRenderer.invoke('git:browseRepo'),
  getGitStatus: (repoPath) => ipcRenderer.invoke('git:getStatus', repoPath),
  
  getFileDiff: (repoPath, filePath, staged) => ipcRenderer.invoke('git:getFileDiff', repoPath, filePath, staged),
  getAllDiff: (repoPath, staged) => ipcRenderer.invoke('git:getAllDiff', repoPath, staged),
  getCommitDiff: (repoPath, commitHash) => ipcRenderer.invoke('git:getCommitDiff', repoPath, commitHash),
  getCommitFileDiff: (repoPath, commitHash, filePath) => ipcRenderer.invoke('git:getCommitFileDiff', repoPath, commitHash, filePath),
  getImageDiff: (repoPath, filePath, staged, commitHash) => ipcRenderer.invoke('git:getImageDiff', repoPath, filePath, staged, commitHash),

  stageFile: (repoPath, filePath) => ipcRenderer.invoke('git:stageFile', repoPath, filePath),
  unstageFile: (repoPath, filePath) => ipcRenderer.invoke('git:unstageFile', repoPath, filePath),
  stageFiles: (repoPath, filePaths) => ipcRenderer.invoke('git:stageFiles', repoPath, filePaths),
  unstageFiles: (repoPath, filePaths) => ipcRenderer.invoke('git:unstageFiles', repoPath, filePaths),
  resetFile: (repoPath, filePath, isUntracked) => ipcRenderer.invoke('git:resetFile', repoPath, filePath, isUntracked),
  resetAll: (repoPath) => ipcRenderer.invoke('git:resetAll', repoPath),
  addToGitIgnore: (repoPath, pattern) => ipcRenderer.invoke('git:addToGitIgnore', repoPath, pattern),
  commit: (repoPath, message) => ipcRenderer.invoke('git:commit', repoPath, message),
  push: (repoPath) => ipcRenderer.invoke('git:push', repoPath),
  pull: (repoPath) => ipcRenderer.invoke('git:pull', repoPath),
  sync: (repoPath) => ipcRenderer.invoke('git:sync', repoPath),
  executePushWithAutoPull: (repoPath) => ipcRenderer.invoke('git:executePushWithAutoPull', repoPath),

  getRecentCommits: (repoPath, count) => ipcRenderer.invoke('git:getRecentCommits', repoPath, count),
  getCommitFiles: (repoPath, commitHash) => ipcRenderer.invoke('git:getCommitFiles', repoPath, commitHash),

  openFile: (repoPath, filePath) => ipcRenderer.invoke('shell:openFile', repoPath, filePath),
  openFolder: (repoPath, filePath) => ipcRenderer.invoke('shell:openFolder', repoPath, filePath),
  copyToClipboard: (text) => ipcRenderer.invoke('shell:copyToClipboard', text),

  loadAiSettings: () => ipcRenderer.invoke('settings:loadAiSettings'),
  saveAiSettings: (settings: AiSettings) => ipcRenderer.invoke('settings:saveAiSettings', settings),
  loadDiffSettings: () => ipcRenderer.invoke('settings:loadDiffSettings'),
  saveDiffSettings: (settings: DiffSettings) => ipcRenderer.invoke('settings:saveDiffSettings', settings),

  testAiConnection: (settings: AiSettings) => ipcRenderer.invoke('ai:testConnection', settings),
  generateAiCommitMessage: (diff, pathTag, settings) => ipcRenderer.invoke('ai:generateCommitMessage', diff, pathTag, settings),
  buildPathTag: (changedFiles) => ipcRenderer.invoke('ai:buildPathTag', changedFiles),
};

contextBridge.exposeInMainWorld('electronAPI', api);
