import React from 'react';
import { ImageDiffData } from '../types';
import { formatFileSize } from '../utils/format';

interface ImagePreviewProps {
  data: ImageDiffData | null;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--surface-0)] p-4 overflow-y-auto">
      <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Image Diff: <span className="text-[var(--accent-text)]">{data.fileName}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-[300px]">
        {/* Before */}
        <div className="flex flex-col bg-[var(--surface-1)] rounded border border-[var(--border-subtle)] p-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-faint)] font-semibold mb-2">
            <span>BEFORE (HEAD)</span>
            {data.beforeSize !== undefined && (
              <span>{formatFileSize(data.beforeSize)}</span>
            )}
          </div>
          <div className="flex-1 transparent-checkered rounded flex items-center justify-center p-2 min-h-[220px] overflow-hidden">
            {data.hasBefore && data.beforeDataUrl ? (
              <img
                src={data.beforeDataUrl}
                alt="Before"
                className="max-h-full max-w-full object-contain shadow"
              />
            ) : (
              <span className="text-xs text-[var(--text-ghost)] italic">(No previous image / new file)</span>
            )}
          </div>
        </div>

        {/* After */}
        <div className="flex flex-col bg-[var(--surface-1)] rounded border border-[var(--border-subtle)] p-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-faint)] font-semibold mb-2">
            <span>AFTER (Working Tree / Current)</span>
            {data.afterSize !== undefined && (
              <span>{formatFileSize(data.afterSize)}</span>
            )}
          </div>
          <div className="flex-1 transparent-checkered rounded flex items-center justify-center p-2 min-h-[220px] overflow-hidden">
            {data.hasAfter && data.afterDataUrl ? (
              <img
                src={data.afterDataUrl}
                alt="After"
                className="max-h-full max-w-full object-contain shadow"
              />
            ) : (
              <span className="text-xs text-[var(--danger-text)] italic">(File deleted)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
