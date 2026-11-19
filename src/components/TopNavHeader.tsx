import React, { useRef, useState } from 'react';

interface TopNavHeaderProps {
  rosterCount: number;
  isExportingPng: boolean;
  onResetMap: () => void;
  onImportJson: (file: File) => void;
  onExportJson: () => void;
  onSnapshotPng: () => void;
  onOpenRosterModal: () => void;
}

export const TopNavHeader: React.FC<TopNavHeaderProps> = ({
  rosterCount,
  isExportingPng,
  onResetMap,
  onImportJson,
  onExportJson,
  onSnapshotPng,
  onOpenRosterModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur-sm">
      {/* Brand Zone */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400">
          <i className="fa-solid fa-chess-board text-sm" aria-hidden="true" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          GvG Strategy Matrix
        </span>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {confirmReset ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-slate-950 px-2.5 py-1">
            <span className="text-xs font-medium text-amber-300 whitespace-nowrap">
              Clear map &amp; drawings?
            </span>
            <button
              type="button"
              onClick={() => {
                onResetMap();
                setConfirmReset(false);
              }}
              className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            title="Reset map objects and drawings while preserving roster"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-file-circle-plus text-amber-400" aria-hidden="true" />
            <span>New</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Import Guild War JSON"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500/50 hover:bg-slate-800 hover:text-blue-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <i className="fa-solid fa-file-import text-blue-400" aria-hidden="true" />
          <span>Import JSON</span>
        </button>

        <button
          type="button"
          onClick={onExportJson}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500/50 hover:bg-slate-800 hover:text-blue-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <i className="fa-solid fa-file-export text-blue-400" aria-hidden="true" />
          <span>Export JSON</span>
        </button>

        <button
          type="button"
          onClick={onSnapshotPng}
          disabled={isExportingPng}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-600/35 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <i
            className={`fa-solid ${isExportingPng ? 'fa-spinner fa-spin' : 'fa-camera'}`}
            aria-hidden="true"
          />
          <span>{isExportingPng ? 'Capturing...' : 'Snapshot PNG'}</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={onOpenRosterModal}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <i className="fa-solid fa-users-gear" aria-hidden="true" />
          <span>Manage Roster</span>
          <span className="font-mono-tabular font-bold">({rosterCount})</span>
        </button>
      </div>
    </header>
  );
};
