import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Bot, Tag, FolderOpen, RotateCcw, Zap, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AiSettings, GitPrefixMode } from '../types';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, aiSettings, updateAiSettings, setRepoPath } = useApp();

  const [formData, setFormData] = useState<AiSettings>({ ...aiSettings });
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      setFormData({ ...aiSettings });
      setTestResult(null);
    }
  }, [isSettingsOpen, aiSettings]);

  if (!isSettingsOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await window.electronAPI.testAiConnection(formData);
      setTestResult({ text: res, isError: false });
    } catch (err: any) {
      setTestResult({ text: err.message || 'Connection failed', isError: true });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBrowseRepo = async () => {
    const selected = await window.electronAPI.browseRepo();
    if (selected) {
      setFormData({ ...formData, repositoryPath: selected });
    }
  };

  const handleResetRepo = async () => {
    const detected = await window.electronAPI.detectRepo();
    setFormData({ ...formData, repositoryPath: detected });
  };

  const handleSave = async () => {
    await updateAiSettings(formData);
    if (formData.repositoryPath) {
      setRepoPath(formData.repositoryPath);
    }
    setIsSettingsOpen(false);
  };

  const getPrefixPreview = () => {
    const custom = (formData.customPrefix || '').trim();
    const tag = '[Services\\GitService]';
    switch (formData.prefixMode) {
      case 'AutoFolder':
        return `${tag} Fix issue in login flow`;
      case 'Custom':
        return custom ? `${custom} Fix issue in login flow` : 'Fix issue in login flow';
      case 'Both':
        return custom ? `${tag} ${custom} Fix issue in login flow` : `${tag} Fix issue in login flow`;
      case 'None':
        return 'Fix issue in login flow';
      default:
        return `${tag} Fix issue in login flow`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-3)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center space-x-2">
            <span>⚙️ AI &amp; Git Settings</span>
          </h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 rounded hover:bg-[var(--surface-6)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* AI Settings Section */}
          <div className="p-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md space-y-3">
            <div className="flex items-center space-x-2 text-[var(--accent-text)] font-bold text-sm">
              <Bot className="w-4 h-4" />
              <span>OpenAI-Compatible AI API</span>
            </div>
            <p className="text-[11px] text-[var(--text-faint)]">
              Compatible with DeepSeek, OpenAI, Groq, Ollama, OpenRouter, and any standard
              /v1/chat/completions endpoint.
            </p>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">API Endpoint URL:</label>
              <input
                type="text"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.deepseek.com/chat/completions"
                className="w-full px-2.5 py-1.5 bg-[var(--surface-3)] text-[var(--text-on-accent)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">API Key:</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="flex-1 px-2.5 py-1.5 bg-[var(--surface-3)] text-[var(--text-on-accent)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[var(--text-secondary)] border border-[var(--border-default)] rounded"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Model Name:</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="deepseek-chat or gpt-4o-mini"
                className="w-full px-2.5 py-1.5 bg-[var(--surface-3)] text-[var(--text-on-accent)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Test Connection */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] font-medium"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-[var(--text-warning)]" />}
                <span>Test Connection</span>
              </button>

              {testResult && (
                <div
                  className={`mt-2 p-2 rounded text-[11px] font-mono whitespace-pre-wrap ${
                    testResult.isError
                      ? 'bg-[var(--badge-deleted-bg)] text-[var(--text-warm)] border border-[var(--danger-border)]'
                      : 'bg-[var(--badge-added-bg)] text-[var(--badge-success-text)] border border-[var(--success-border)]'
                  }`}
                >
                  {testResult.text}
                </div>
              )}
            </div>
          </div>

          {/* Commit Prefix Section */}
          <div className="p-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md space-y-3">
            <div className="flex items-center space-x-2 text-[var(--accent-text)] font-bold text-sm">
              <Tag className="w-4 h-4" />
              <span>Git Commit Prefix</span>
            </div>
            <p className="text-[11px] text-[var(--text-faint)]">
              Control how commit messages are prefixed (auto folder tags, custom prefix, or both).
            </p>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Prefix Mode:</label>
              <select
                value={formData.prefixMode}
                onChange={(e) =>
                  setFormData({ ...formData, prefixMode: e.target.value as GitPrefixMode })
                }
                className="w-full px-2.5 py-1.5 bg-[var(--surface-3)] text-[var(--text-on-accent)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="AutoFolder">Auto Folder Tag (e.g. [Services\GitService])</option>
                <option value="Custom">Custom Prefix Only (e.g. feat: or [WIP])</option>
                <option value="Both">Both (e.g. [Services\GitService] feat:)</option>
                <option value="None">None (No prefix)</option>
              </select>
            </div>

            {(formData.prefixMode === 'Custom' || formData.prefixMode === 'Both') && (
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Custom Prefix String:</label>
                <input
                  type="text"
                  value={formData.customPrefix}
                  onChange={(e) => setFormData({ ...formData, customPrefix: e.target.value })}
                  placeholder="e.g. feat: or fix: or [WIP]"
                  className="w-full px-2.5 py-1.5 bg-[var(--surface-3)] text-[var(--text-on-accent)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[var(--text-faint)] font-medium">Live Preview:</label>
              <div className="p-2 bg-[var(--surface-0)] border border-[var(--border-subtle)] rounded font-mono text-[11px] text-[var(--accent-text)]">
                {getPrefixPreview()}
              </div>
            </div>
          </div>

          {/* Repository Section */}
          <div className="p-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md space-y-3">
            <div className="flex items-center space-x-2 text-[var(--accent-text)] font-bold text-sm">
              <FolderOpen className="w-4 h-4" />
              <span>Git Repository Path</span>
            </div>

            <div className="space-y-1">
              <label className="text-[var(--text-secondary)] font-medium">Working Directory:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={formData.repositoryPath}
                  onChange={(e) => setFormData({ ...formData, repositoryPath: e.target.value })}
                  placeholder="Auto-detected repository..."
                  className="flex-1 px-2.5 py-1.5 bg-[var(--surface-3)] text-[var(--text-on-accent)] border border-[var(--border-default)] rounded focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={handleBrowseRepo}
                  className="px-3 py-1.5 bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded font-medium"
                >
                  Browse...
                </button>
                <button
                  type="button"
                  onClick={handleResetRepo}
                  title="Reset to auto-detected repository"
                  className="p-2 bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-3)]">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-1.5 rounded bg-[var(--surface-5)] hover:bg-[var(--surface-6)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] text-xs font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
