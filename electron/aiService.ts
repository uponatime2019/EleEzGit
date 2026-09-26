import { AiSettings, GitPrefixMode } from '../src/types';
import { loadAiSettings } from './settingsStore';

export const MaxDiffCharsForCommit = 3500;
export const CompactLinesPerFile = 30;

export function extractDiffFilePath(section: string): string {
  if (!section) return 'unknown';

  const lines = section.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      return line.substring('+++ b/'.length).trim();
    }
    if (line.startsWith('+++ ')) {
      return line.substring(4).trim();
    }
  }

  const match = section.match(/diff --git a\/(.+?) b\//);
  if (match && match[1]) {
    return match[1].trim();
  }

  const firstLine = lines[0]?.trim();
  return firstLine || 'unknown';
}

export function buildCompactDiff(
  fullDiff: string,
  maxTotalChars: number = MaxDiffCharsForCommit,
  linesPerFile: number = CompactLinesPerFile
): string {
  if (!fullDiff) return '';
  if (fullDiff.length <= maxTotalChars) return fullDiff;

  const sections = fullDiff
    .split(/(?=^diff --git )/m)
    .filter((s) => s.trim().length > 0);

  if (sections.length === 0) {
    return fullDiff.substring(0, maxTotalChars) + '\n... [truncated]';
  }

  const fileCount = sections.length;
  const perFileBudget = Math.max(300, Math.floor(maxTotalChars / Math.max(1, fileCount)) - 120);
  const linesBudget = Math.max(10, Math.min(linesPerFile, Math.floor(perFileBudget / 60)));

  const linesOut: string[] = [
    `[Full diff was ${fullDiff.length} chars across ${fileCount} file(s); shortened to file paths + first ${linesBudget} lines per file]\n`,
  ];

  let currentLength = linesOut[0].length;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const filePath = extractDiffFilePath(section);

    let sectionHeader = `\n--- File: ${filePath} ---\n`;
    const kept: string[] = [];
    let changedKept = 0;

    const rawLines = section.split(/\r?\n/);
    for (const rawLine of rawLines) {
      const line = rawLine.trimEnd();
      const isHeader =
        line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('--- ') ||
        line.startsWith('+++ ') ||
        line.startsWith('@@') ||
        line.startsWith('Binary files ') ||
        line.startsWith('new file') ||
        line.startsWith('deleted file') ||
        line.startsWith('similarity') ||
        line.startsWith('rename ');

      if (isHeader) {
        kept.push(line);
        continue;
      }

      if (changedKept >= linesBudget) continue;

      const isChange = line.length > 0 && (line[0] === '+' || line[0] === '-');
      if (isChange) {
        kept.push(line);
        changedKept++;
      }
    }

    if (changedKept === 0) {
      kept.push(
        ...rawLines
          .map((l) => l.trimEnd())
          .filter((l) => l.trim().length > 0)
          .slice(0, linesBudget)
      );
    }

    let fileBlock = kept.join('\n');
    if (fileBlock.length > perFileBudget) {
      fileBlock = fileBlock.substring(0, perFileBudget) + '\n... [file truncated]';
    } else if (rawLines.length > kept.length + 1) {
      fileBlock += `\n... [truncated ${rawLines.length - kept.length} more lines for this file]`;
    }

    if (currentLength + fileBlock.length + sectionHeader.length > maxTotalChars) {
      const remaining = fileCount - i;
      linesOut.push(
        sectionHeader +
          fileBlock.substring(0, Math.max(0, maxTotalChars - currentLength - 200))
      );
      linesOut.push(`\n... [omitted diff bodies for ${remaining - 1} more file(s); paths listed below]`);
      for (const rest of sections.slice(i + 1)) {
        linesOut.push('- ' + extractDiffFilePath(rest));
        if (linesOut.join('\n').length >= maxTotalChars) break;
      }
      break;
    }

    linesOut.push(sectionHeader + fileBlock);
    currentLength += sectionHeader.length + fileBlock.length;
  }

  let result = linesOut.join('\n');
  if (result.length > maxTotalChars) {
    result = result.substring(0, maxTotalChars) + '\n... [truncated]';
  }
  return result;
}

export function buildPathTag(changedFiles: string[]): string {
  if (!changedFiles || changedFiles.length === 0) return 'others';

  const counts: Record<string, number> = {};

  for (const raw of changedFiles) {
    let p = raw.replace(/\\/g, '/').trim();
    if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
    const parts = p.split('/').filter((x) => x.length > 0);
    if (parts.length > 1) {
      const tagParts = parts
        .slice(0, Math.min(3, parts.length - 1))
        .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
        .filter((part) => part.length > 0)
        .map((part) => (part.length > 8 ? part.substring(0, 8) : part));

      if (tagParts.length > 0) {
        const tag = tagParts.join('\\');
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
  }

  let mostUsedTag = 'others';
  let maxCount = 0;
  for (const [tag, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedTag = tag;
    }
  }

  return mostUsedTag;
}

export function getFormattedPrefix(pathTag: string, settings: AiSettings): string {
  const custom = (settings.customPrefix || '').trim();
  const tag = pathTag ? pathTag : 'others';

  switch (settings.prefixMode) {
    case 'AutoFolder':
      return `[${tag}]`;
    case 'Custom':
      return custom;
    case 'Both':
      return custom ? `[${tag}] ${custom}` : `[${tag}]`;
    case 'None':
      return '';
    default:
      return `[${tag}]`;
  }
}

export function normalizeCommitMessage(
  message: string,
  pathTag: string,
  settings: AiSettings
): string {
  if (!message) return '';

  let normalized = message
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove any existing bracketed prefix if generated by AI
  normalized = normalized.replace(/^\[[^\]]+\]\s*/, '').trim();

  const prefix = getFormattedPrefix(pathTag, settings);
  if (prefix) {
    normalized = `${prefix} ${normalized}`;
  }

  if (normalized.length > 120) {
    normalized = normalized.substring(0, 120).trimEnd();
  }

  return normalized;
}

export async function generateTextAsync(
  systemPrompt: string,
  userPrompt: string,
  settings?: AiSettings,
  temperature = 0.3,
  maxTokens = 120
): Promise<string> {
  const currentSettings = settings || loadAiSettings();

  if (!currentSettings.apiUrl) {
    throw new Error('API URL is not configured. Please open AI Settings to enter a valid OpenAI API endpoint.');
  }

  const payload = {
    model: currentSettings.model || 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt || '' },
      { role: 'user', content: userPrompt || '' },
    ],
    max_tokens: maxTokens,
    temperature: temperature,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (currentSettings.apiKey && currentSettings.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${currentSettings.apiKey.trim()}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(currentSettings.apiUrl.trim(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`API request failed (${response.status}): ${response.statusText}\n${responseText}`);
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;

    if (!content) {
      throw new Error('AI service returned an empty response.');
    }

    return content.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function testConnectionAsync(settings: AiSettings): Promise<string> {
  const start = Date.now();
  const reply = await generateTextAsync(
    "You are an API tester. Return only 'OK'.",
    'Ping',
    settings,
    0.1,
    10
  );
  const duration = Date.now() - start;
  return `Success (${duration} ms): ${reply}`;
}

export async function generateCommitMessageAsync(
  diff: string,
  pathTag: string,
  settings?: AiSettings
): Promise<string> {
  const currentSettings = settings || loadAiSettings();

  const systemPrompt =
    'Write one concise Git commit description. Do not add a tag, prefix, or square brackets; the application adds the appropriate prefix. ' +
    'Return only that single line, with no quotes, no Markdown, and no explanation. Keep the whole line under 110 characters.';

  const compactDiff = buildCompactDiff(diff || '');
  const userPrompt = 'Create a commit message for this diff:\n\n' + compactDiff;

  const rawMessage = await generateTextAsync(
    systemPrompt,
    userPrompt,
    currentSettings,
    0.2,
    120
  );

  return normalizeCommitMessage(rawMessage, pathTag, currentSettings);
}
