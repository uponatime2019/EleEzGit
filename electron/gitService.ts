import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GitCommandResult, GitFileStatus, GitCommitInfo, ImageDiffData } from '../src/types';
import { loadAiSettings } from './settingsStore';

export function isGitIndexLockError(output?: string, error?: string): boolean {
  const combined = ((output || '') + ' ' + (error || '')).toLowerCase();
  return combined.includes('.git/index.lock');
}

export async function runGit(args: string[], repoPath: string, retryIndexLock = true): Promise<GitCommandResult> {
  if (!repoPath) {
    return { exitCode: -1, output: '', error: 'No repository path specified' };
  }

  return new Promise((resolve) => {
    let output = '';
    let error = '';

    const child = spawn('git', args, {
      cwd: repoPath,
      shell: false,
      windowsHide: true,
    });

    child.stdout.setEncoding('utf-8');
    child.stderr.setEncoding('utf-8');

    child.stdout.on('data', (data) => {
      output += data;
    });

    child.stderr.on('data', (data) => {
      error += data;
    });

    const timeout = setTimeout(() => {
      try {
        child.kill();
      } catch {}
      resolve({ exitCode: -1, output, error: 'ERROR: Git process timed out' });
    }, 45000);

    child.on('close', async (code) => {
      clearTimeout(timeout);
      const exitCode = code ?? -1;

      if (exitCode !== 0 && retryIndexLock && isGitIndexLockError(output, error)) {
        await new Promise((r) => setTimeout(r, 2000));
        const retryResult = await runGit(args, repoPath, false);
        return resolve(retryResult);
      }

      resolve({ exitCode, output, error });
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ exitCode: -1, output: '', error: err.message });
    });
  });
}

export async function runGitBinary(args: string[], repoPath: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: repoPath,
      windowsHide: true,
    });

    const chunks: Buffer[] = [];

    child.stdout.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    const timeout = setTimeout(() => {
      try { child.kill(); } catch {}
      resolve(null);
    }, 15000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        resolve(null);
      }
    });

    child.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

export function detectDefaultRepositoryPath(): string {
  const aiSettings = loadAiSettings();
  if (aiSettings.repositoryPath && fs.existsSync(aiSettings.repositoryPath)) {
    if (fs.existsSync(path.join(aiSettings.repositoryPath, '.git'))) {
      return aiSettings.repositoryPath;
    }
  }

  // Search upward from current working directory
  let current = process.cwd();
  while (current) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Known standard paths (generic, no user-specific hardcoded paths)
  const known = [
    path.join(os.homedir(), 'Documents', 'Sources'),
    path.join(os.homedir(), 'Projects'),
    path.join(os.homedir(), 'Documents', 'Projects'),
    path.join(os.homedir(), 'source', 'repos'),
    'D:\\Projects',
    'C:\\Projects',
  ];

  for (const p of known) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, '.git'))) {
      return p;
    }
  }

  for (const p of known) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return process.cwd();
}

export function unquoteGitPath(gitPath: string): string {
  let p = gitPath.trim();
  if (p.startsWith('"') && p.endsWith('"') && p.length >= 2) {
    p = p.substring(1, p.length - 1);
  }
  return p;
}

export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg'].includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export async function getGitStatus(repoPath: string): Promise<{ unstaged: GitFileStatus[]; staged: GitFileStatus[] }> {
  const res = await runGit(['status', '--porcelain=v1', '-uall'], repoPath);
  if (res.exitCode !== 0 && !res.output) {
    return { unstaged: [], staged: [] };
  }

  const lines = res.output.split(/\r?\n/).filter((l) => l.length >= 3);
  const unstaged: GitFileStatus[] = [];
  const staged: GitFileStatus[] = [];

  for (const line of lines) {
    const x = line[0];
    const y = line[1];
    const rawPath = line.substring(3).trim();
    const cleanPath = unquoteGitPath(rawPath).replace(/\\/g, '/');

    let fullPath = path.join(repoPath, cleanPath);
    let size = 0;
    try {
      if (fs.existsSync(fullPath)) {
        size = fs.statSync(fullPath).size;
      }
    } catch {}

    const isImage = isImageFile(cleanPath);
    const hasSeriousWarning = !isImage && size > 800 * 1024;
    const seriousWarningToolTip = hasSeriousWarning
      ? `🚨 Serious Warning: File size is ${formatFileSize(size)} (> 800KB limit for non-images)`
      : '';

    const lastSlash = cleanPath.lastIndexOf('/');
    const fileName = lastSlash >= 0 ? cleanPath.substring(lastSlash + 1) : cleanPath;
    const folderPath = lastSlash >= 0 ? cleanPath.substring(0, lastSlash) : '';

    const isUntracked = x === '?' && y === '?';
    const isConflicted = !isUntracked && (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D'));
    const isStaged = !isUntracked && ['A', 'M', 'D', 'R', 'C'].includes(x);
    const hasUnstagedChanges = isUntracked || y !== ' ';
    const isModified = !isUntracked && (x === 'M' || y === 'M');
    const isAdded = !isUntracked && x === 'A';
    const isDeleted = !isUntracked && (x === 'D' || y === 'D');

    // Unstaged item
    if (hasUnstagedChanges) {
      unstaged.push({
        statusCode: isUntracked ? '??' : (y !== ' ' ? y : x),
        filePath: cleanPath,
        displayStatus: isUntracked ? '??' : (y !== ' ' ? y : x),
        displayPath: cleanPath,
        cleanPath,
        fileName,
        folderPath,
        isUntracked,
        isStaged: false,
        hasUnstagedChanges: true,
        isModified,
        isAdded,
        isDeleted: y === 'D',
        isConflicted,
        isImage,
        fileSizeBytes: size,
        hasSeriousWarning,
        seriousWarningToolTip
      });
    }

    // Staged item
    if (isStaged) {
      staged.push({
        statusCode: x,
        filePath: cleanPath,
        displayStatus: x,
        displayPath: cleanPath,
        cleanPath,
        fileName,
        folderPath,
        isUntracked: false,
        isStaged: true,
        hasUnstagedChanges: false,
        isModified: x === 'M',
        isAdded: x === 'A',
        isDeleted: x === 'D',
        isConflicted: false,
        isImage,
        fileSizeBytes: size,
        hasSeriousWarning,
        seriousWarningToolTip
      });
    }
  }

  return { unstaged, staged };
}

export async function getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<string> {
  const normPath = filePath.replace(/\\/g, '/');

  if (staged) {
    const res = await runGit(['diff', '--cached', '--', normPath], repoPath);
    return res.output || res.error || '(No changes in staged diff)';
  }

  // Check if untracked
  const checkUntracked = await runGit(['status', '--porcelain', '--', normPath], repoPath);
  if (checkUntracked.output.startsWith('??')) {
    const fullPath = path.join(repoPath, normPath);
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split(/\r?\n/).map((l) => '+' + l).join('\n');
        return `diff --git a/${normPath} b/${normPath}\nnew file mode 100644\n--- /dev/null\n+++ b/${normPath}\n@@ -0,0 +1,${lines.split('\n').length} @@\n` + lines;
      }
    } catch (e: any) {
      return `(Error reading untracked file: ${e.message})`;
    }
  }

  const res = await runGit(['diff', '--', normPath], repoPath);
  return res.output || res.error || '(No changes in working tree)';
}

export async function getAllDiff(repoPath: string, staged: boolean): Promise<string> {
  if (staged) {
    const res = await runGit(['diff', '--cached'], repoPath);
    return res.output || '(No staged changes)';
  }

  const res = await runGit(['diff'], repoPath);
  let output = res.output;

  // Also include untracked files
  const statusRes = await runGit(['status', '--porcelain', '-uall'], repoPath);
  const untracked = statusRes.output
    .split(/\r?\n/)
    .filter((l) => l.startsWith('??'))
    .map((l) => unquoteGitPath(l.substring(3).trim()));

  for (const uf of untracked) {
    const fullPath = path.join(repoPath, uf);
    try {
      if (fs.existsSync(fullPath) && !isImageFile(uf)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split(/\r?\n/).map((l) => '+' + l).join('\n');
        output += `\ndiff --git a/${uf} b/${uf}\nnew file mode 100644\n--- /dev/null\n+++ b/${uf}\n@@ -0,0 +1,${lines.split('\n').length} @@\n` + lines;
      }
    } catch {}
  }

  return output || '(No changes)';
}

export async function getCommitDiff(repoPath: string, commitHash: string): Promise<string> {
  const res = await runGit(['show', '--format=', commitHash], repoPath);
  return res.output || res.error || '(No diff for commit)';
}

export async function getCommitFileDiff(repoPath: string, commitHash: string, filePath: string): Promise<string> {
  const normPath = filePath.replace(/\\/g, '/');
  const res = await runGit(['show', commitHash, '--', normPath], repoPath);
  return res.output || res.error || '(No diff for this file in commit)';
}

export async function getImageDiff(
  repoPath: string,
  filePath: string,
  staged: boolean,
  commitHash?: string
): Promise<ImageDiffData> {
  const normPath = filePath.replace(/\\/g, '/');
  const fileName = path.basename(normPath);
  const ext = path.extname(normPath).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.ico' ? 'image/x-icon' : `image/${ext.replace('.', '')}`;

  let beforeBuffer: Buffer | null = null;
  let afterBuffer: Buffer | null = null;

  if (commitHash) {
    // Commit mode: Before is commitHash^:filePath, After is commitHash:filePath
    beforeBuffer = await runGitBinary(['show', `${commitHash}^:${normPath}`], repoPath);
    afterBuffer = await runGitBinary(['show', `${commitHash}:${normPath}`], repoPath);
  } else if (staged) {
    // Staged: Before is HEAD:filePath, After is :filePath (staged index)
    beforeBuffer = await runGitBinary(['show', `HEAD:${normPath}`], repoPath);
    afterBuffer = await runGitBinary(['show', `:${normPath}`], repoPath);
  } else {
    // Working tree: Before is HEAD:filePath, After is disk file
    beforeBuffer = await runGitBinary(['show', `HEAD:${normPath}`], repoPath);
    const fullPath = path.join(repoPath, normPath);
    if (fs.existsSync(fullPath)) {
      try {
        afterBuffer = fs.readFileSync(fullPath);
      } catch {}
    }
  }

  const result: ImageDiffData = {
    hasBefore: !!beforeBuffer,
    hasAfter: !!afterBuffer,
    fileName,
    beforeSize: beforeBuffer?.length,
    afterSize: afterBuffer?.length,
  };

  if (beforeBuffer) {
    result.beforeDataUrl = `data:${mime};base64,${beforeBuffer.toString('base64')}`;
  }
  if (afterBuffer) {
    result.afterDataUrl = `data:${mime};base64,${afterBuffer.toString('base64')}`;
  }

  return result;
}

export function isMergeInProgress(repoPath: string): boolean {
  try {
    const gitDir = path.join(repoPath, '.git');
    if (!fs.existsSync(gitDir)) return false;
    return (
      fs.existsSync(path.join(gitDir, 'MERGE_HEAD')) ||
      fs.existsSync(path.join(gitDir, 'rebase-merge')) ||
      fs.existsSync(path.join(gitDir, 'rebase-apply')) ||
      fs.existsSync(path.join(gitDir, 'CHERRY_PICK_HEAD')) ||
      fs.existsSync(path.join(gitDir, 'REVERT_HEAD'))
    );
  } catch {
    return false;
  }
}

export async function executePushWithAutoPull(repoPath: string): Promise<GitCommandResult> {
  const pushRes = await runGit(['push'], repoPath);
  const combined = ((pushRes.error || '') + ' ' + (pushRes.output || '')).toLowerCase();

  if (
    pushRes.exitCode !== 0 &&
    (combined.includes('[rejected]') ||
      combined.includes('updates were rejected') ||
      combined.includes('fetch first'))
  ) {
    if (isMergeInProgress(repoPath)) {
      return {
        exitCode: pushRes.exitCode,
        output: pushRes.output,
        error: 'Push rejected: remote has updates, and a merge is in progress. Manual resolution required.',
      };
    }

    // Auto pull first
    const pullRes = await runGit(['pull', '--no-edit'], repoPath);
    if (pullRes.exitCode === 0) {
      // Retry push
      return await runGit(['push'], repoPath);
    } else {
      return {
        exitCode: pullRes.exitCode,
        output: pullRes.output,
        error: 'Auto-pull failed (manual resolution required): ' + (pullRes.error || pullRes.output),
      };
    }
  }

  return pushRes;
}

export async function getRecentCommits(repoPath: string, count = 50): Promise<GitCommitInfo[]> {
  const res = await runGit(
    ['log', `-n${count}`, '--pretty=format:%H|%h|%an|%ad|%s', '--date=relative'],
    repoPath
  );

  if (res.exitCode !== 0 || !res.output) return [];

  const lines = res.output.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const commits: GitCommitInfo[] = [];

  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length >= 5) {
      const hash = parts[0];
      const shortHash = parts[1];
      const author = parts[2];
      const date = parts[3];
      const message = parts.slice(4).join('|');

      let tagSection = '';
      let messageSection = message;

      const trimmed = message.trimStart();
      if (trimmed.startsWith('[')) {
        const endIdx = trimmed.indexOf(']');
        if (endIdx > 0) {
          tagSection = trimmed.substring(0, endIdx + 1);
          messageSection = trimmed.substring(endIdx + 1).trimStart();
        }
      }

      commits.push({
        hash,
        shortHash,
        message,
        tagSection,
        messageSection,
        date,
        author,
      });
    }
  }

  return commits;
}

export async function getCommitFiles(repoPath: string, commitHash: string): Promise<GitFileStatus[]> {
  const res = await runGit(
    ['diff-tree', '--no-commit-id', '--name-status', '-r', commitHash],
    repoPath
  );

  if (res.exitCode !== 0 || !res.output) return [];

  const lines = res.output.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const files: GitFileStatus[] = [];

  for (const line of lines) {
    const parts = line.split(/\t+/);
    if (parts.length >= 2) {
      const statusChar = parts[0].trim();
      const rawPath = parts[1].trim();
      const cleanPath = unquoteGitPath(rawPath).replace(/\\/g, '/');
      const isImage = isImageFile(cleanPath);
      const lastSlash = cleanPath.lastIndexOf('/');
      const fileName = lastSlash >= 0 ? cleanPath.substring(lastSlash + 1) : cleanPath;
      const folderPath = lastSlash >= 0 ? cleanPath.substring(0, lastSlash) : '';

      files.push({
        statusCode: statusChar,
        filePath: cleanPath,
        displayStatus: statusChar,
        displayPath: cleanPath,
        cleanPath,
        fileName,
        folderPath,
        isUntracked: false,
        isStaged: false,
        hasUnstagedChanges: false,
        isModified: statusChar === 'M',
        isAdded: statusChar === 'A',
        isDeleted: statusChar === 'D',
        isConflicted: false,
        isImage,
        fileSizeBytes: 0,
        hasSeriousWarning: false,
        seriousWarningToolTip: '',
      });
    }
  }

  return files;
}
