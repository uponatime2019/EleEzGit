import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { AiSettings, DiffSettings } from '../src/types';

const defaultAiSettings: AiSettings = {
  apiUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-chat',
  prefixMode: 'AutoFolder',
  customPrefix: '',
  repositoryPath: ''
};

const defaultDiffSettings: DiffSettings = {
  fontSize: 12,
  fontFamily: 'Cascadia Code',
  changesFilesWidth: 280,
  treeDepth: 2,
  hideChangesWhenStaged: true,
  isSingleDiffView: false,
  theme: 'system'
};

function getSettingsDir(): string {
  // Use app.getPath('userData') or fallback to %LOCALAPPDATA%\EleEzGit
  try {
    return path.join(app.getPath('userData'), 'settings');
  } catch {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'EleEzGit');
  }
}

function getLegacyEzGitDir(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'EzGit');
}

export function loadAiSettings(): AiSettings {
  const dir = getSettingsDir();
  const filePath = path.join(dir, 'ai_settings.json');
  const legacyPath = path.join(getLegacyEzGitDir(), 'ai_settings.json');

  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { ...defaultAiSettings, ...data };
    } else if (fs.existsSync(legacyPath)) {
      const data = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
      // Map PascalCase if coming from C#
      return {
        apiUrl: data.ApiUrl || data.apiUrl || defaultAiSettings.apiUrl,
        apiKey: data.ApiKey || data.apiKey || defaultAiSettings.apiKey,
        model: data.Model || data.model || defaultAiSettings.model,
        prefixMode: data.PrefixMode || data.prefixMode || defaultAiSettings.prefixMode,
        customPrefix: data.CustomPrefix || data.customPrefix || defaultAiSettings.customPrefix,
        repositoryPath: data.RepositoryPath || data.repositoryPath || defaultAiSettings.repositoryPath,
      };
    }
  } catch (err) {
    console.error('Failed to load AI settings:', err);
  }
  return { ...defaultAiSettings };
}

export function saveAiSettings(settings: AiSettings): void {
  const dir = getSettingsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, 'ai_settings.json');
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function loadDiffSettings(): DiffSettings {
  const dir = getSettingsDir();
  const filePath = path.join(dir, 'diff_settings.json');
  const legacyPath = path.join(getLegacyEzGitDir(), 'diff_settings.json');

  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { ...defaultDiffSettings, ...data };
    } else if (fs.existsSync(legacyPath)) {
      const data = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
      return {
        fontSize: data.FontSize ?? data.fontSize ?? defaultDiffSettings.fontSize,
        fontFamily: data.FontFamily || data.fontFamily || defaultDiffSettings.fontFamily,
        changesFilesWidth: data.ChangesFilesWidth ?? data.changesFilesWidth ?? defaultDiffSettings.changesFilesWidth,
        treeDepth: data.TreeDepth ?? data.treeDepth ?? defaultDiffSettings.treeDepth,
        hideChangesWhenStaged: data.HideChangesWhenStaged ?? data.hideChangesWhenStaged ?? defaultDiffSettings.hideChangesWhenStaged,
        isSingleDiffView: data.IsSingleDiffView ?? data.isSingleDiffView ?? defaultDiffSettings.isSingleDiffView,
        theme: data.Theme || data.theme || defaultDiffSettings.theme,
      };
    }
  } catch (err) {
    console.error('Failed to load Diff settings:', err);
  }
  return { ...defaultDiffSettings };
}

export function saveDiffSettings(settings: DiffSettings): void {
  const dir = getSettingsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, 'diff_settings.json');
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}
