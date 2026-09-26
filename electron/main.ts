import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  detectDefaultRepositoryPath,
  getGitStatus,
  getFileDiff,
  getAllDiff,
  getCommitDiff,
  getCommitFileDiff,
  getImageDiff,
  runGit,
  executePushWithAutoPull,
  getRecentCommits,
  getCommitFiles,
} from './gitService';
import {
  loadAiSettings,
  saveAiSettings,
  loadDiffSettings,
  saveDiffSettings,
} from './settingsStore';
import {
  testConnectionAsync,
  generateCommitMessageAsync,
  buildPathTag,
} from './aiService';
import { AiSettings, DiffSettings } from '../src/types';

process.on('uncaughtException', (err) => {
  console.error('[Main] UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main] UNHANDLED REJECTION:', reason);
});

let mainWindow: BrowserWindow | null = null;

// Single-instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    console.log('[Main] Second instance detected. Restoring window.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    console.log('[Main] App is ready. Creating window...');
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/AppIcon.ico');
  const htmlPath = path.join(__dirname, '../dist/index.html');

  console.log('[Main] Loading HTML from:', htmlPath, 'Exists:', fs.existsSync(htmlPath));

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'EleEzGit',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#202020',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Window finished loading HTML.');
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.error('[Main] Window failed to load:', code, desc, url);
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    console.log('[Main] Loading dev URL:', devUrl);
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Setup IPC handlers
ipcMain.handle('git:detectRepo', async () => {
  return detectDefaultRepositoryPath();
});

ipcMain.handle('git:browseRepo', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Git Repository',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('git:getStatus', async (_, repoPath: string) => {
  return await getGitStatus(repoPath);
});

ipcMain.handle('git:getFileDiff', async (_, repoPath: string, filePath: string, staged: boolean) => {
  return await getFileDiff(repoPath, filePath, staged);
});

ipcMain.handle('git:getAllDiff', async (_, repoPath: string, staged: boolean) => {
  return await getAllDiff(repoPath, staged);
});

ipcMain.handle('git:getCommitDiff', async (_, repoPath: string, commitHash: string) => {
  return await getCommitDiff(repoPath, commitHash);
});

ipcMain.handle('git:getCommitFileDiff', async (_, repoPath: string, commitHash: string, filePath: string) => {
  return await getCommitFileDiff(repoPath, commitHash, filePath);
});

ipcMain.handle(
  'git:getImageDiff',
  async (_, repoPath: string, filePath: string, staged: boolean, commitHash?: string) => {
    return await getImageDiff(repoPath, filePath, staged, commitHash);
  }
);

ipcMain.handle('git:stageFile', async (_, repoPath: string, filePath: string) => {
  return await runGit(['add', '--', filePath.replace(/\\/g, '/')], repoPath);
});

ipcMain.handle('git:unstageFile', async (_, repoPath: string, filePath: string) => {
  const norm = filePath.replace(/\\/g, '/');
  const res = await runGit(['restore', '--staged', '--', norm], repoPath);
  if (res.exitCode !== 0) {
    return await runGit(['reset', 'HEAD', '--', norm], repoPath);
  }
  return res;
});

ipcMain.handle('git:stageFiles', async (_, repoPath: string, filePaths: string[]) => {
  const paths = filePaths.map((p) => p.replace(/\\/g, '/'));
  return await runGit(['add', '--', ...paths], repoPath);
});

ipcMain.handle('git:unstageFiles', async (_, repoPath: string, filePaths: string[]) => {
  const paths = filePaths.map((p) => p.replace(/\\/g, '/'));
  const res = await runGit(['restore', '--staged', '--', ...paths], repoPath);
  if (res.exitCode !== 0) {
    return await runGit(['reset', 'HEAD', '--', ...paths], repoPath);
  }
  return res;
});

ipcMain.handle('git:resetFile', async (_, repoPath: string, filePath: string, isUntracked: boolean) => {
  const norm = filePath.replace(/\\/g, '/');
  if (isUntracked) {
    const fullPath = path.join(repoPath, norm);
    try {
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        return { exitCode: 0, output: 'Deleted ' + norm, error: '' };
      }
    } catch (err: any) {
      return await runGit(['clean', '-fd', '--', norm], repoPath);
    }
    return { exitCode: 0, output: 'Deleted ' + norm, error: '' };
  } else {
    const res = await runGit(['restore', '--', norm], repoPath);
    if (res.exitCode !== 0) {
      return await runGit(['checkout', 'HEAD', '--', norm], repoPath);
    }
    return res;
  }
});

ipcMain.handle('git:resetAll', async (_, repoPath: string) => {
  const resetRes = await runGit(['reset', '--hard', 'HEAD'], repoPath);
  const cleanRes = await runGit(['clean', '-fd'], repoPath);
  return {
    exitCode: resetRes.exitCode === 0 && cleanRes.exitCode === 0 ? 0 : -1,
    output: resetRes.output + '\n' + cleanRes.output,
    error: resetRes.error + '\n' + cleanRes.error,
  };
});

ipcMain.handle('git:addToGitIgnore', async (_, repoPath: string, pattern: string) => {
  try {
    const gitIgnorePath = path.join(repoPath, '.gitignore');
    const normPattern = pattern.replace(/\\/g, '/');
    let content = '';
    if (fs.existsSync(gitIgnorePath)) {
      content = fs.readFileSync(gitIgnorePath, 'utf-8');
      if (!content.endsWith('\n') && content.length > 0) {
        content += '\n';
      }
    }
    content += normPattern + '\n';
    fs.writeFileSync(gitIgnorePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to add to .gitignore:', err);
    return false;
  }
});

ipcMain.handle('git:commit', async (_, repoPath: string, message: string) => {
  return await runGit(['commit', '-m', message], repoPath);
});

ipcMain.handle('git:push', async (_, repoPath: string) => {
  return await runGit(['push'], repoPath);
});

ipcMain.handle('git:pull', async (_, repoPath: string) => {
  return await runGit(['pull', '--no-edit'], repoPath);
});

ipcMain.handle('git:sync', async (_, repoPath: string) => {
  const pullResult = await runGit(['pull', '--no-edit'], repoPath);
  if (pullResult.exitCode !== 0) {
    return { pullResult };
  }
  const pushResult = await runGit(['push'], repoPath);
  return { pullResult, pushResult };
});

ipcMain.handle('git:executePushWithAutoPull', async (_, repoPath: string) => {
  return await executePushWithAutoPull(repoPath);
});

ipcMain.handle('git:getRecentCommits', async (_, repoPath: string, count?: number) => {
  return await getRecentCommits(repoPath, count || 50);
});

ipcMain.handle('git:getCommitFiles', async (_, repoPath: string, commitHash: string) => {
  return await getCommitFiles(repoPath, commitHash);
});

ipcMain.handle('shell:openFile', async (_, repoPath: string, filePath: string) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(repoPath, filePath);
  if (fs.existsSync(fullPath)) {
    await shell.openPath(fullPath);
    return true;
  }
  return false;
});

ipcMain.handle('shell:openFolder', async (_, repoPath: string, filePath: string) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(repoPath, filePath);
  if (fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
    return true;
  } else if (fs.existsSync(repoPath)) {
    await shell.openPath(repoPath);
    return true;
  }
  return false;
});

ipcMain.handle('shell:copyToClipboard', async (_, text: string) => {
  clipboard.writeText(text);
});

ipcMain.handle('settings:loadAiSettings', async () => {
  return loadAiSettings();
});

ipcMain.handle('settings:saveAiSettings', async (_, settings: AiSettings) => {
  saveAiSettings(settings);
});

ipcMain.handle('settings:loadDiffSettings', async () => {
  return loadDiffSettings();
});

ipcMain.handle('settings:saveDiffSettings', async (_, settings: DiffSettings) => {
  saveDiffSettings(settings);
});

ipcMain.handle('ai:testConnection', async (_, settings: AiSettings) => {
  return await testConnectionAsync(settings);
});

ipcMain.handle(
  'ai:generateCommitMessage',
  async (_, diff: string, pathTag: string, settings?: AiSettings) => {
    return await generateCommitMessageAsync(diff, pathTag, settings);
  }
);

ipcMain.handle('ai:buildPathTag', async (_, changedFiles: string[]) => {
  return buildPathTag(changedFiles);
});
