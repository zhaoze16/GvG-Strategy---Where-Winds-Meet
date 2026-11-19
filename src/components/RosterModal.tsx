import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MAP_ICONS_META, ROLE_META } from '../data/defaultRoster';
import { AssetIcon, MapIconType, PathIcon, Player, PlayerRole, WeaponIcon } from '../types/gvg';
import {
  autoMatchSystemIconsFromFiles,
  DetectedPathBundle,
  detectPathBundlesFromFiles,
  extractRelativeFilesFromDrop,
  findAssetIcon,
  processAssetIconFile,
  processSingleIconWithColor,
} from '../utils/storageAndSchema';
import { IconPickerInput } from './IconPickerInput';

export type RosterModalTab = 'roster' | 'weapons' | 'paths' | 'icons';

interface RosterModalProps {
  isOpen: boolean;
  initialTab?: RosterModalTab;
  players: Player[];
  weaponIcons: WeaponIcon[];
  pathIcons: PathIcon[];
  roleIcons: Partial<Record<PlayerRole, string>>;
  roleIconColors: Partial<Record<PlayerRole, string>>;
  mapObjectIcons: Partial<Record<MapIconType, string>>;
  mapObjectIconColors: Partial<Record<MapIconType, string>>;
  onClose: () => void;
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer: (originalId: string, updated: Player) => void;
  onDeletePlayer: (id: string) => void;
  onClearAllPlayers: () => void;
  onAddWeaponIcons: (icons: WeaponIcon[]) => void;
  onRenameWeaponIcon: (id: string, newName: string) => void;
  onDeleteWeaponIcon: (id: string) => void;
  onClearAllWeaponIcons: () => void;
  onAddPathIcons: (icons: PathIcon[]) => void;
  onRenamePathIcon: (id: string, newName: string) => void;
  onUpdatePathColor: (id: string, color: string) => void;
  onDeletePathIcon: (id: string) => void;
  onClearAllPathIcons: () => void;
  onUpdateRoleIcon: (role: PlayerRole, dataUrl: string | null, accentColor?: string) => void;
  onUpdateRoleIconColor: (role: PlayerRole, color: string) => void;
  onUpdateMapObjectIcon: (type: MapIconType, dataUrl: string | null, accentColor?: string) => void;
  onUpdateMapObjectIconColor: (type: MapIconType, color: string) => void;
  onBatchUpdateSystemIcons: (
    roles: Partial<Record<PlayerRole, string>>,
    roleColors: Partial<Record<PlayerRole, string>>,
    mapObjects: Partial<Record<MapIconType, string>>,
    mapObjectColors: Partial<Record<MapIconType, string>>
  ) => void;
  onResetAllSystemIcons: () => void;
}

const ROLES: PlayerRole[] = ['DPS', 'Tank', 'Healer', 'Support'];
const MAP_OBJECT_ORDER: MapIconType[] = [
  'blueTower',
  'redTower',
  'blueTree',
  'redTree',
  'blueGoose',
  'redGoose',
  'boss',
  'enemy',
];

interface AssetLibraryTabProps {
  title: string;
  exampleName: string;
  icons: AssetIcon[];
  prefix: 'wpn' | 'path';
  enableFolderBundle?: boolean;
  onAddIcons: (icons: AssetIcon[]) => void;
  onAddWeaponIconsFromBundle?: (icons: WeaponIcon[]) => void;
  onRenameIcon: (id: string, newName: string) => void;
  onUpdateIconColor?: (id: string, color: string) => void;
  onDeleteIcon: (id: string) => void;
  onClearAll: () => void;
}

const AssetLibraryTab: React.FC<AssetLibraryTabProps> = ({
  title,
  exampleName,
  icons,
  prefix,
  enableFolderBundle = false,
  onAddIcons,
  onAddWeaponIconsFromBundle,
  onRenameIcon,
  onUpdateIconColor,
  onDeleteIcon,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingBundles, setPendingBundles] = useState<DetectedPathBundle[]>([]);

  const handleSingleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(f.name)
    );
    if (files.length === 0) {
      setFeedback('Please select PNG, JPG, WebP, or SVG image files.');
      return;
    }

    try {
      const processed = await Promise.all(files.map((f) => processAssetIconFile(f, prefix)));
      onAddIcons(processed);
      setFeedback(`Saved ${processed.length} ${title.toLowerCase()} to library.`);
    } catch {
      setFeedback('Some icon files could not be processed.');
    }
  };

  const handleFolderFileList = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const relativeItems = Array.from(fileList).map((file) => ({
      file,
      relativePath:
        (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    }));
    const bundles = await detectPathBundlesFromFiles(relativeItems);
    if (bundles.length === 0) {
      setFeedback('No image files found inside the selected folder.');
      return;
    }
    setPendingBundles(bundles);
    setFeedback(
      `Detected ${bundles.length} path ${bundles.length === 1 ? 'folder' : 'folders'}. Review below and click Save All.`
    );
  };

  const handleDropZone = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (enableFolderBundle) {
      const relativeItems = await extractRelativeFilesFromDrop(e.dataTransfer);
      const hasFolderStructure = relativeItems.some(
        (item) => item.relativePath.replace(/^\/+/, '').includes('/')
      );
      if (hasFolderStructure) {
        const bundles = await detectPathBundlesFromFiles(relativeItems);
        if (bundles.length > 0) {
          setPendingBundles(bundles);
          setFeedback(
            `Detected ${bundles.length} path ${bundles.length === 1 ? 'folder' : 'folders'}. Review below and click Save All.`
          );
          return;
        }
      }
    }

    handleSingleFiles(e.dataTransfer.files);
  };

  const swapBundlePathIcon = (folderKey: string, weaponId: string) => {
    setPendingBundles((prev) =>
      prev.map((bundle) => {
        if (bundle.folderKey !== folderKey) return bundle;
        const targetWeapon = bundle.weaponIcons.find((w) => w.id === weaponId);
        if (!targetWeapon) return bundle;

        const oldPathAsWeapon: WeaponIcon = {
          ...bundle.pathIcon,
          id: bundle.pathIcon.id.replace(/^path-/, 'wpn-'),
          linkedWeapons: undefined,
        };
        const nextWeapons = [
          ...bundle.weaponIcons.filter((w) => w.id !== weaponId),
          oldPathAsWeapon,
        ];
        const nextPath: PathIcon = {
          ...targetWeapon,
          id: targetWeapon.id.replace(/^wpn-/, 'path-'),
          linkedWeapons: nextWeapons.map((w) => w.name),
        };
        return {
          ...bundle,
          pathIcon: nextPath,
          weaponIcons: nextWeapons,
        };
      })
    );
  };

  const updateBundlePathName = (folderKey: string, name: string) => {
    setPendingBundles((prev) =>
      prev.map((b) =>
        b.folderKey === folderKey ? { ...b, pathIcon: { ...b.pathIcon, name } } : b
      )
    );
  };

  const updateBundleWeaponName = (folderKey: string, weaponId: string, name: string) => {
    setPendingBundles((prev) =>
      prev.map((b) => {
        if (b.folderKey !== folderKey) return b;
        const nextWeapons = b.weaponIcons.map((w) =>
          w.id === weaponId ? { ...w, name } : w
        );
        return {
          ...b,
          weaponIcons: nextWeapons,
          pathIcon: {
            ...b.pathIcon,
            linkedWeapons: nextWeapons.map((w) => w.name),
          },
        };
      })
    );
  };

  const commitDetectedBundles = () => {
    if (pendingBundles.length === 0) return;
    const allPaths: PathIcon[] = pendingBundles.map((b) => ({
      ...b.pathIcon,
      linkedWeapons: b.weaponIcons.map((w) => w.name.trim()).filter(Boolean),
    }));
    const allWeapons: WeaponIcon[] = pendingBundles.flatMap((b) =>
      b.weaponIcons.map((w) => ({
        ...w,
        linkedPath: b.pathIcon.name.trim(),
      }))
    );

    onAddIcons(allPaths);
    if (onAddWeaponIconsFromBundle && allWeapons.length > 0) {
      onAddWeaponIconsFromBundle(allWeapons);
    }

    setFeedback(
      `Saved ${allPaths.length} ${allPaths.length === 1 ? 'path' : 'paths'} and ${allWeapons.length} weapon ${allWeapons.length === 1 ? 'icon' : 'icons'}.`
    );
    setPendingBundles([]);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
        onChange={(e) => {
          handleSingleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {enableFolderBundle && (
        <input
          ref={folderInputRef}
          type="file"
          multiple
          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={(e) => {
            handleFolderFileList(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropZone}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-700 bg-slate-950/60'
        }`}
      >
        <i className="fa-solid fa-folder-open text-2xl text-amber-400 mb-2" aria-hidden="true" />
        <div className="text-sm font-semibold text-slate-100">
          {enableFolderBundle
            ? 'Upload Path Folder(s) or Individual Path Icons'
            : `Upload ${title} Files`}
        </div>
        <p className="mt-1 max-w-2xl text-xs text-slate-400">
          {enableFolderBundle
            ? 'Select or drag a Path folder (containing 1 Path logo + 2 Weapon logos) or a parent folder containing all Path folders at once. Filenames become icon names automatically.'
            : `Select or drag image files (PNG, SVG, WebP, JPG). Names are extracted from filenames (e.g., ${exampleName}.png → ${exampleName.replace(/_/g, ' ')}).`}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {enableFolderBundle && (
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-folder-plus" aria-hidden="true" />
              <span>Upload Path Folder(s)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-blue-500/60 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-images" aria-hidden="true" />
            <span>Upload Image Files</span>
          </button>
        </div>

        {feedback && <div className="mt-2.5 text-xs font-medium text-emerald-400">{feedback}</div>}
      </div>

      {/* Folder Bundle Detection Preview */}
      {pendingBundles.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-slate-950/90 p-4 space-y-3 max-h-64 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-amber-300">
                Detected Path Bundles ({pendingBundles.length})
              </div>
              <div className="text-[11px] text-slate-400">
                Verify the Path logo and its 2 Weapon logos below, or click &ldquo;Make Path&rdquo; to swap.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingBundles([])}
                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitDetectedBundles}
                className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 cursor-pointer"
              >
                Save All ({pendingBundles.length} Paths)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {pendingBundles.map((bundle) => (
              <div
                key={bundle.folderKey}
                className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={bundle.pathIcon.imageDataUrl}
                    alt={bundle.pathIcon.name}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 shrink-0 rounded border border-amber-500/60 bg-slate-950 object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-amber-400">
                      Path Logo (Folder: {bundle.folderName})
                    </div>
                    <input
                      type="text"
                      value={bundle.pathIcon.name}
                      onChange={(e) => updateBundlePathName(bundle.folderKey, e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pl-2 border-l border-slate-800">
                  {bundle.weaponIcons.map((w) => (
                    <div key={w.id} className="flex items-center gap-2">
                      <img
                        src={w.imageDataUrl}
                        alt={w.name}
                        referrerPolicy="no-referrer"
                        className="h-7 w-7 shrink-0 rounded border border-slate-700 bg-slate-950 object-contain p-0.5"
                      />
                      <input
                        type="text"
                        value={w.name}
                        onChange={(e) =>
                          updateBundleWeaponName(bundle.folderKey, w.id, e.target.value)
                        }
                        className="min-w-0 flex-1 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => swapBundlePathIcon(bundle.folderKey, w.id)}
                        title="Use this image as the Path logo instead"
                        className="shrink-0 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300 hover:border-amber-500/60 hover:text-amber-300 cursor-pointer"
                      >
                        Make Path
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Icons Grid */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">
          Saved {title} ({icons.length})
        </span>
        {icons.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-trash" aria-hidden="true" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {icons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-500">
            No {title.toLowerCase()} uploaded yet. Upload your files or folders above and assign them in Roster Members.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {icons.map((icon) => (
              <div
                key={icon.id}
                className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/75 p-2.5"
              >
                <img
                  src={icon.imageDataUrl}
                  alt={icon.name}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 shrink-0 rounded-md bg-slate-900 object-contain p-1"
                  style={{
                    border:
                      prefix === 'path'
                        ? `1.5px solid ${icon.accentColor || '#94a3b8'}`
                        : '1px solid #334155',
                  }}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={icon.name}
                      onChange={(e) => onRenameIcon(icon.id, e.target.value)}
                      aria-label={`Name for ${icon.name}`}
                      className="min-w-0 flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                    {prefix === 'path' && onUpdateIconColor && (
                      <input
                        type="color"
                        value={icon.accentColor || '#94a3b8'}
                        onChange={(e) => onUpdateIconColor(icon.id, e.target.value)}
                        title="Path border color"
                        aria-label={`Border color for ${icon.name}`}
                        className="h-6 w-6 shrink-0 cursor-pointer rounded border border-slate-700 bg-slate-900 p-0.5"
                      />
                    )}
                  </div>
                  {icon.linkedWeapons && icon.linkedWeapons.length > 0 && (
                    <div className="truncate text-[10px] text-slate-400">
                      Weapons: {icon.linkedWeapons.join(' · ')}
                    </div>
                  )}
                  {icon.linkedPath && (
                    <div className="truncate text-[10px] text-slate-400">
                      Path: {icon.linkedPath}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteIcon(icon.id)}
                  title={`Delete ${icon.name}`}
                  className="shrink-0 pt-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface SystemIconsTabProps {
  roleIcons: Partial<Record<PlayerRole, string>>;
  roleIconColors: Partial<Record<PlayerRole, string>>;
  mapObjectIcons: Partial<Record<MapIconType, string>>;
  mapObjectIconColors: Partial<Record<MapIconType, string>>;
  onUpdateRoleIcon: (role: PlayerRole, dataUrl: string | null, accentColor?: string) => void;
  onUpdateRoleIconColor: (role: PlayerRole, color: string) => void;
  onUpdateMapObjectIcon: (type: MapIconType, dataUrl: string | null, accentColor?: string) => void;
  onUpdateMapObjectIconColor: (type: MapIconType, color: string) => void;
  onBatchUpdateSystemIcons: (
    roles: Partial<Record<PlayerRole, string>>,
    roleColors: Partial<Record<PlayerRole, string>>,
    mapObjects: Partial<Record<MapIconType, string>>,
    mapObjectColors: Partial<Record<MapIconType, string>>
  ) => void;
  onResetAllSystemIcons: () => void;
}

const SystemIconsTab: React.FC<SystemIconsTabProps> = ({
  roleIcons,
  roleIconColors,
  mapObjectIcons,
  mapObjectIconColors,
  onUpdateRoleIcon,
  onUpdateRoleIconColor,
  onUpdateMapObjectIcon,
  onUpdateMapObjectIconColor,
  onBatchUpdateSystemIcons,
  onResetAllSystemIcons,
}) => {
  const batchInputRef = useRef<HTMLInputElement>(null);
  const slotInputRef = useRef<HTMLInputElement>(null);
  const slotTargetRef = useRef<
    { kind: 'role'; role: PlayerRole } | { kind: 'map'; type: MapIconType } | null
  >(null);
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const customCount =
    Object.values(roleIcons).filter(Boolean).length +
    Object.values(mapObjectIcons).filter(Boolean).length;

  const handleBatchFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const result = await autoMatchSystemIconsFromFiles(fileList);
    if (result.matchedCount > 0) {
      onBatchUpdateSystemIcons(
        result.matchedRoles,
        result.matchedRoleColors,
        result.matchedMapObjects,
        result.matchedMapObjectColors
      );
    }
    if (result.matchedCount > 0 && result.unmatchedNames.length === 0) {
      setFeedback(`Matched & updated ${result.matchedCount} icon(s) automatically.`);
    } else if (result.matchedCount > 0) {
      setFeedback(
        `Updated ${result.matchedCount} icon(s). Unmatched: ${result.unmatchedNames.join(', ')} (upload directly on any card below).`
      );
    } else {
      setFeedback(
        'No filenames matched (use names like healer, tank, dps, goose, tree, tower, boss, enemy) or upload directly on each card below.'
      );
    }
  };

  const handleSingleSlotFile = async (
    target: { kind: 'role'; role: PlayerRole } | { kind: 'map'; type: MapIconType },
    file: File
  ) => {
    try {
      const { imageDataUrl, accentColor } = await processSingleIconWithColor(file);
      if (target.kind === 'role') {
        onUpdateRoleIcon(target.role, imageDataUrl, accentColor);
        setFeedback(`Updated ${target.role} icon.`);
      } else {
        onUpdateMapObjectIcon(target.type, imageDataUrl, accentColor);
        setFeedback(`Updated ${MAP_ICONS_META[target.type].label} icon.`);
      }
    } catch {
      setFeedback('Could not process selected image file.');
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-5">
      <input
        ref={batchInputRef}
        type="file"
        multiple
        accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
        onChange={(e) => {
          handleBatchFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <input
        ref={slotInputRef}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const target = slotTargetRef.current;
          if (file && target) {
            handleSingleSlotFile(target, file);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Batch Auto-Match Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingBatch(true);
        }}
        onDragLeave={() => setIsDraggingBatch(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingBatch(false);
          handleBatchFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
          isDraggingBatch
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-700 bg-slate-950/60'
        }`}
      >
        <i className="fa-solid fa-icons text-xl text-amber-400 mb-1.5" aria-hidden="true" />
        <div className="text-sm font-semibold text-slate-100">
          Upload &amp; Replace Role &amp; Map Object Icons
        </div>
        <p className="mt-1 max-w-2xl text-xs text-slate-400">
          Drop multiple files at once (e.g. <span className="text-slate-200">healer.png</span>,{' '}
          <span className="text-slate-200">tank.png</span>,{' '}
          <span className="text-slate-200">dps.png</span>,{' '}
          <span className="text-slate-200">goose.png</span>,{' '}
          <span className="text-slate-200">tree.png</span>,{' '}
          <span className="text-slate-200">blue_tower.png</span>) to auto-match, or replace individual slots below.
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => batchInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
            <span>Upload Multiple (Auto-Match)</span>
          </button>

          {customCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onResetAllSystemIcons();
                setFeedback('Reset all Role and Map Object icons to defaults.');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left" aria-hidden="true" />
              <span>Reset All ({customCount})</span>
            </button>
          )}
        </div>

        {feedback && <div className="mt-2 text-xs font-medium text-emerald-400">{feedback}</div>}
      </div>

      {/* Player Roles Section */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Player Role Icons (DPS / Tank / Healer / Support)
          </h3>
          <span className="text-[11px] text-slate-500">Click Replace or drop image on any card</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => {
            const meta = ROLE_META[role];
            const customUrl = roleIcons[role];
            const borderHex = (customUrl && roleIconColors[role]) || meta.borderHex;
            return (
              <div
                key={role}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleSingleSlotFile({ kind: 'role', role }, file);
                }}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/75 p-3"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full overflow-hidden"
                  style={{
                    backgroundColor: customUrl ? '#0f172a' : meta.bgHex,
                    border: `2px solid ${borderHex}`,
                    color: meta.textHex,
                  }}
                >
                  {customUrl ? (
                    <img
                      src={customUrl}
                      alt={role}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 object-contain"
                    />
                  ) : (
                    <i className={`${meta.faIcon} text-sm`} aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-100">{meta.label}</span>
                    {customUrl && (
                      <span className="text-[10px] font-medium text-emerald-400">Custom</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        slotTargetRef.current = { kind: 'role', role };
                        slotInputRef.current?.click();
                      }}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-amber-500/60 hover:text-amber-300 cursor-pointer"
                    >
                      Replace
                    </button>
                    {customUrl && (
                      <>
                        <input
                          type="color"
                          value={borderHex}
                          onChange={(e) => onUpdateRoleIconColor(role, e.target.value)}
                          title="Role border color"
                          aria-label={`Border color for ${meta.label}`}
                          className="h-6 w-6 shrink-0 cursor-pointer rounded border border-slate-700 bg-slate-900 p-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateRoleIcon(role, null)}
                          title="Reset to default icon"
                          className="rounded border border-slate-800 px-2 py-1 text-[11px] text-slate-400 hover:border-rose-500/50 hover:text-rose-300 cursor-pointer"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Map Objects & Spawner Section */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Map Objects &amp; Spawner Icons
          </h3>
          <span className="text-[11px] text-slate-500">Applies to Sidebar &amp; Map Canvas</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MAP_OBJECT_ORDER.map((type) => {
            const meta = MAP_ICONS_META[type];
            const customUrl = mapObjectIcons[type];
            const borderHex = (customUrl && mapObjectIconColors[type]) || meta.borderHex;
            return (
              <div
                key={type}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleSingleSlotFile({ kind: 'map', type }, file);
                }}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/75 p-3"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: customUrl ? '#0f172a' : meta.bgHex,
                    border: `2px solid ${borderHex}`,
                    color: meta.accentHex,
                  }}
                >
                  {customUrl ? (
                    <img
                      src={customUrl}
                      alt={meta.label}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 object-contain"
                    />
                  ) : (
                    <i className={`${meta.faIcon} text-sm`} aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-slate-100">
                      {meta.label}
                    </span>
                    {customUrl && (
                      <span className="text-[10px] font-medium text-emerald-400 shrink-0">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        slotTargetRef.current = { kind: 'map', type };
                        slotInputRef.current?.click();
                      }}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-amber-500/60 hover:text-amber-300 cursor-pointer"
                    >
                      Replace
                    </button>
                    {customUrl && (
                      <>
                        <input
                          type="color"
                          value={borderHex}
                          onChange={(e) => onUpdateMapObjectIconColor(type, e.target.value)}
                          title="Object border color"
                          aria-label={`Border color for ${meta.label}`}
                          className="h-6 w-6 shrink-0 cursor-pointer rounded border border-slate-700 bg-slate-900 p-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateMapObjectIcon(type, null)}
                          title="Reset to default icon"
                          className="rounded border border-slate-800 px-2 py-1 text-[11px] text-slate-400 hover:border-rose-500/50 hover:text-rose-300 cursor-pointer"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export const RosterModal: React.FC<RosterModalProps> = ({
  isOpen,
  initialTab = 'roster',
  players,
  weaponIcons,
  pathIcons,
  roleIcons,
  roleIconColors,
  mapObjectIcons,
  mapObjectIconColors,
  onClose,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onClearAllPlayers,
  onAddWeaponIcons,
  onRenameWeaponIcon,
  onDeleteWeaponIcon,
  onClearAllWeaponIcons,
  onAddPathIcons,
  onRenamePathIcon,
  onUpdatePathColor,
  onDeletePathIcon,
  onClearAllPathIcons,
  onUpdateRoleIcon,
  onUpdateRoleIconColor,
  onUpdateMapObjectIcon,
  onUpdateMapObjectIconColor,
  onBatchUpdateSystemIcons,
  onResetAllSystemIcons,
}) => {
  const [modalTab, setModalTab] = useState<RosterModalTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setModalTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [formState, setFormState] = useState<Player>({
    id: '',
    name: '',
    role: 'DPS',
    team: '',
    weapon1: '',
    weapon2: '',
    path1: '',
    path2: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return players.filter((p) => {
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.weapon1.toLowerCase().includes(q) ||
        p.weapon2.toLowerCase().includes(q) ||
        (p.path1 || '').toLowerCase().includes(q) ||
        (p.path2 || '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [players, roleFilter, searchQuery]);

  const path1LinkedWeapons = useMemo(() => {
    const pIcon = findAssetIcon(formState.path1, pathIcons);
    return pIcon?.linkedWeapons || [];
  }, [formState.path1, pathIcons]);

  const path2LinkedWeapons = useMemo(() => {
    const pIcon = findAssetIcon(formState.path2, pathIcons);
    return pIcon?.linkedWeapons || [];
  }, [formState.path2, pathIcons]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setFormState({
      id: '',
      name: '',
      role: 'DPS',
      team: '',
      weapon1: '',
      weapon2: '',
      path1: '',
      path2: '',
    });
    setFormError(null);
  };

  const findMatchingPathForWeapon = (weaponName: string): string | null => {
    const norm = weaponName.trim().toLowerCase();
    if (!norm) return null;

    const matchedPath = pathIcons.find((p) =>
      p.linkedWeapons?.some((w) => w.trim().toLowerCase() === norm)
    );
    if (matchedPath) return matchedPath.name;

    const matchedWeapon = weaponIcons.find((w) => w.name.trim().toLowerCase() === norm);
    if (matchedWeapon?.linkedPath) return matchedWeapon.linkedPath;

    return null;
  };

  const handleWeapon1Change = (val: string) => {
    const autoPath = findMatchingPathForWeapon(val);
    setFormState((s) => ({
      ...s,
      weapon1: val,
      path1: autoPath !== null ? autoPath : s.path1,
    }));
  };

  const handleWeapon2Change = (val: string) => {
    const autoPath = findMatchingPathForWeapon(val);
    setFormState((s) => ({
      ...s,
      weapon2: val,
      path2: autoPath !== null ? autoPath : s.path2,
    }));
  };

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setFormState({
      ...player,
      path1: player.path1 || '',
      path2: player.path2 || '',
    });
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError('Player name is required.');
      return;
    }

    const generatedId =
      formState.id.trim() || `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 100)}`;

    const duplicate = players.some(
      (p) => p.id === generatedId && p.id !== editingId
    );
    if (duplicate) {
      setFormError(`Player ID "${generatedId}" already exists.`);
      return;
    }

    const payload: Player = {
      id: generatedId,
      name: trimmedName,
      role: formState.role,
      team: formState.team.trim(),
      weapon1: formState.weapon1.trim(),
      weapon2: formState.weapon2.trim(),
      path1: (formState.path1 || '').trim(),
      path2: (formState.path2 || '').trim(),
    };

    if (editingId) {
      onUpdatePlayer(editingId, payload);
    } else {
      onAddPlayer(payload);
    }
    resetForm();
  };

  const renderSlotCell = (weaponName?: string, pathName?: string) => {
    const wIcon = findAssetIcon(weaponName, weaponIcons);
    const pIcon = findAssetIcon(pathName, pathIcons);
    if (!weaponName && !pathName) return <span className="text-slate-600">—</span>;

    return (
      <div className="flex items-center gap-1.5">
        {pIcon ? (
          <img
            src={pIcon.imageDataUrl}
            alt={pIcon.name}
            title={`Path: ${pIcon.name}`}
            referrerPolicy="no-referrer"
            className="h-6 w-6 shrink-0 rounded bg-slate-950 object-contain p-0.5"
            style={{ border: `1.5px solid ${pIcon.accentColor || '#94a3b8'}` }}
          />
        ) : pathName ? (
          <span
            title={`Path: ${pathName}`}
            className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-300"
          >
            {pathName}
          </span>
        ) : null}

        {wIcon ? (
          <img
            src={wIcon.imageDataUrl}
            alt={wIcon.name}
            title={`Weapon: ${wIcon.name}`}
            referrerPolicy="no-referrer"
            className="h-6 w-6 shrink-0 rounded border border-slate-700 bg-slate-950 object-contain p-0.5"
          />
        ) : weaponName ? (
          <span className="text-slate-300">{weaponName}</span>
        ) : null}

        {(wIcon || pIcon) && weaponName && (
          <span className="truncate text-slate-300" title={weaponName}>
            {weaponName}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <h2
              id="roster-modal-title"
              className="font-display text-lg font-bold text-slate-100"
            >
              Guild War Roster &amp; Loadout Icons
            </h2>
            <p className="text-xs text-slate-400">
              Manage guild members, mix dual Weapon + Martial Path loadouts, and upload Path folders or icons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setModalTab('roster')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  modalTab === 'roster'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Roster ({players.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('paths')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  modalTab === 'paths'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Path Icons ({pathIcons.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('weapons')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  modalTab === 'weapons'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Weapon Icons ({weaponIcons.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('icons')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  modalTab === 'icons'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Role &amp; Map Icons
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Roster Manager"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        </div>

        {modalTab === 'roster' && (
          <>
            {/* Add / Edit Player Form */}
            <form
              onSubmit={handleSubmit}
              className="border-b border-slate-800 bg-slate-950/60 px-6 py-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">
                  {editingId ? `Editing Player (${editingId})` : 'Add New Roster Member'}
                </span>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formState.id}
                    onChange={(e) => setFormState((s) => ({ ...s, id: e.target.value }))}
                    placeholder="Auto ID"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono-tabular text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Player Name *
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Kaelen"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Role
                  </label>
                  <select
                    value={formState.role}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, role: e.target.value as PlayerRole }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Team / Squad
                  </label>
                  <input
                    type="text"
                    value={formState.team}
                    onChange={(e) => setFormState((s) => ({ ...s, team: e.target.value }))}
                    placeholder="e.g. Vanguard"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Weapon 1
                  </label>
                  <IconPickerInput
                    value={formState.weapon1}
                    onChange={handleWeapon1Change}
                    icons={weaponIcons}
                    prioritizedNames={path1LinkedWeapons}
                    placeholder="Pick Weapon 1"
                    emptyHint="Upload in Weapon Icons or Path Icons tab"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Path 1
                  </label>
                  <IconPickerInput
                    value={formState.path1 || ''}
                    onChange={(val) => setFormState((s) => ({ ...s, path1: val }))}
                    icons={pathIcons}
                    placeholder="Auto / Pick Path 1"
                    emptyHint="Upload in Path Icons tab"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Weapon 2
                  </label>
                  <IconPickerInput
                    value={formState.weapon2}
                    onChange={handleWeapon2Change}
                    icons={weaponIcons}
                    prioritizedNames={path2LinkedWeapons}
                    placeholder="Pick Weapon 2"
                    emptyHint="Upload in Weapon Icons or Path Icons tab"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Path 2
                  </label>
                  <div className="flex gap-1.5">
                    <div className="min-w-0 flex-1">
                      <IconPickerInput
                        value={formState.path2 || ''}
                        onChange={(val) => setFormState((s) => ({ ...s, path2: val }))}
                        icons={pathIcons}
                        placeholder="Auto / Pick Path 2"
                        emptyHint="Upload in Path Icons tab"
                      />
                    </div>
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      {editingId ? 'Save' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="text-xs font-medium text-rose-400">{formError}</div>
              )}
            </form>

            {/* Search & Role Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <i
                    className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players, weapons, paths..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5">
                  {(['ALL', ...ROLES] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRoleFilter(role)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        roleFilter === role
                          ? 'bg-slate-800 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {role === 'ALL' ? 'All Roles' : role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-xs text-slate-400">
                  Showing {filteredPlayers.length} of {players.length}
                </span>

                {confirmClearAll ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-2.5 py-1">
                    <span className="text-xs text-rose-300">Clear all?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllPlayers();
                        setConfirmClearAll(false);
                        resetForm();
                      }}
                      className="rounded bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="rounded px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    disabled={players.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Roster Table */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {filteredPlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <i className="fa-solid fa-users-slash text-2xl text-slate-600 mb-2" aria-hidden="true" />
                  <div className="text-sm font-medium text-slate-300">No players found</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Adjust your search filter or add a new guild member above.
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 pr-3 font-medium">ID</th>
                      <th className="py-2.5 px-3 font-medium">Name</th>
                      <th className="py-2.5 px-3 font-medium">Role</th>
                      <th className="py-2.5 px-3 font-medium">Squad</th>
                      <th className="py-2.5 px-3 font-medium">Slot 1 (Path + Weapon)</th>
                      <th className="py-2.5 px-3 font-medium">Slot 2 (Path + Weapon)</th>
                      <th className="py-2.5 pl-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredPlayers.map((player) => {
                      const rMeta = ROLE_META[player.role];
                      const isEditing = editingId === player.id;
                      return (
                        <tr
                          key={player.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isEditing ? 'bg-blue-950/25' : ''
                          }`}
                        >
                          <td className="py-2.5 pr-3 font-mono-tabular text-slate-400">
                            {player.id}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {player.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="inline-flex items-center gap-1.5 font-medium"
                              style={{ color: rMeta.textHex }}
                            >
                              {roleIcons[player.role] ? (
                                <img
                                  src={roleIcons[player.role]}
                                  alt={player.role}
                                  referrerPolicy="no-referrer"
                                  className="h-4 w-4 rounded-full object-contain"
                                />
                              ) : (
                                <i className={`${rMeta.faIcon} text-[11px]`} aria-hidden="true" />
                              )}
                              <span>{player.role}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {player.team || <span className="text-slate-500">Unassigned</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {renderSlotCell(player.weapon1, player.path1)}
                          </td>
                          <td className="py-2.5 px-3">
                            {renderSlotCell(player.weapon2, player.path2)}
                          </td>
                          <td className="py-2.5 pl-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEdit(player)}
                                title="Edit player"
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 hover:border-blue-500 hover:text-blue-300 transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-pen text-[11px]" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingId === player.id) resetForm();
                                  onDeletePlayer(player.id);
                                }}
                                title="Delete player"
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-rose-300 hover:border-rose-500 hover:bg-rose-950/60 transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-trash text-[11px]" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {modalTab === 'paths' && (
          <AssetLibraryTab
            title="Path Icons"
            exampleName="Bellstrike - Splendor"
            icons={pathIcons}
            prefix="path"
            enableFolderBundle
            onAddIcons={onAddPathIcons}
            onAddWeaponIconsFromBundle={onAddWeaponIcons}
            onRenameIcon={onRenamePathIcon}
            onUpdateIconColor={onUpdatePathColor}
            onDeleteIcon={onDeletePathIcon}
            onClearAll={onClearAllPathIcons}
          />
        )}

        {modalTab === 'weapons' && (
          <AssetLibraryTab
            title="Weapon Icons"
            exampleName="Mo_Blade"
            icons={weaponIcons}
            prefix="wpn"
            onAddIcons={onAddWeaponIcons}
            onRenameIcon={onRenameWeaponIcon}
            onDeleteIcon={onDeleteWeaponIcon}
            onClearAll={onClearAllWeaponIcons}
          />
        )}

        {modalTab === 'icons' && (
          <SystemIconsTab
            roleIcons={roleIcons}
            roleIconColors={roleIconColors}
            mapObjectIcons={mapObjectIcons}
            mapObjectIconColors={mapObjectIconColors}
            onUpdateRoleIcon={onUpdateRoleIcon}
            onUpdateRoleIconColor={onUpdateRoleIconColor}
            onUpdateMapObjectIcon={onUpdateMapObjectIcon}
            onUpdateMapObjectIconColor={onUpdateMapObjectIconColor}
            onBatchUpdateSystemIcons={onBatchUpdateSystemIcons}
            onResetAllSystemIcons={onResetAllSystemIcons}
          />
        )}
      </div>
    </div>
  );
};
