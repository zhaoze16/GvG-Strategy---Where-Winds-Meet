import {
  AppState,
  AssetIcon,
  DrawingArrow,
  DrawingPath,
  GuildWarExportSchema,
  MapIconType,
  PlacedIcon,
  PlacedPlayer,
  PlacedSquad,
  Player,
  PlayerRole,
  TacticalNote,
} from '../types/gvg';
import { DEFAULT_PLAYERS } from '../data/defaultRoster';

const STORAGE_KEY = 'gvg_strategy_matrix_state_v1';

export function createInitialState(): AppState {
  const defaultPlacedIcons: PlacedIcon[] = [
    { id: 'init-bt-1', type: 'blueTower', x: 600, y: 745, label: 'South Gate' },
    { id: 'init-rt-1', type: 'redTower', x: 600, y: 155, label: 'North Gate' },
    { id: 'init-boss-1', type: 'boss', x: 600, y: 450, label: 'Citadel Seal' },
  ];

  return {
    players: DEFAULT_PLAYERS,
    placedPlayers: [],
    placedSquads: [],
    placedIcons: defaultPlacedIcons,
    arrows: [],
    drawings: [],
    notes: [],
    teamNames: {
      Vanguard: 'Vanguard',
      'Flank Squad': 'Flank Squad',
      'Citadel Guard': 'Citadel Guard',
    },
    weaponIcons: [],
    pathIcons: [],
    roleIcons: {},
    roleIconColors: {},
    mapObjectIcons: {},
    mapObjectIconColors: {},
    mapType: 'fortress',
    customMapImage: null,
  };
}

const VALID_ROLES: PlayerRole[] = ['DPS', 'Tank', 'Healer', 'Support'];
const VALID_MAP_ICON_TYPES: MapIconType[] = [
  'blueTower',
  'redTower',
  'blueTree',
  'redTree',
  'blueGoose',
  'redGoose',
  'boss',
  'enemy',
];

function normalizeIconRecord<K extends string>(
  raw: unknown,
  allowedKeys: K[]
): Partial<Record<K, string>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Partial<Record<K, string>> = {};
  for (const key of allowedKeys) {
    const val = (raw as Record<string, unknown>)[key];
    if (typeof val === 'string' && val.length > 0) {
      result[key] = val;
    }
  }
  return result;
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      players: Array.isArray(parsed.players) ? parsed.players : DEFAULT_PLAYERS,
      placedPlayers: Array.isArray(parsed.placedPlayers) ? parsed.placedPlayers : [],
      placedSquads: Array.isArray(parsed.placedSquads) ? parsed.placedSquads : [],
      placedIcons: Array.isArray(parsed.placedIcons) ? parsed.placedIcons : [],
      arrows: Array.isArray(parsed.arrows) ? parsed.arrows : [],
      drawings: Array.isArray(parsed.drawings) ? parsed.drawings : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      teamNames:
        parsed.teamNames && typeof parsed.teamNames === 'object' ? parsed.teamNames : {},
      weaponIcons: Array.isArray(parsed.weaponIcons) ? parsed.weaponIcons : [],
      pathIcons: Array.isArray(parsed.pathIcons) ? parsed.pathIcons : [],
      roleIcons: normalizeIconRecord(parsed.roleIcons, VALID_ROLES),
      roleIconColors: normalizeIconRecord(parsed.roleIconColors, VALID_ROLES),
      mapObjectIcons: normalizeIconRecord(parsed.mapObjectIcons, VALID_MAP_ICON_TYPES),
      mapObjectIconColors: normalizeIconRecord(parsed.mapObjectIconColors, VALID_MAP_ICON_TYPES),
      mapType:
        parsed.mapType === 'fortress' || parsed.mapType === 'grid' || parsed.mapType === 'custom'
          ? parsed.mapType
          : 'fortress',
      customMapImage: typeof parsed.customMapImage === 'string' ? parsed.customMapImage : null,
    };
  } catch {
    return createInitialState();
  }
}

export function saveAppState(state: AppState): void {
  // Always save lightweight tactical state to localStorage; binary assets live in IndexedDB
  const coreState = {
    players: state.players,
    placedPlayers: state.placedPlayers,
    placedSquads: state.placedSquads,
    placedIcons: state.placedIcons,
    arrows: state.arrows,
    drawings: state.drawings,
    notes: state.notes,
    teamNames: state.teamNames,
    mapType: state.mapType,
  };

  try {
    // Try saving full state if small enough, otherwise fall back to coreState
    const fullSerialized = JSON.stringify(state);
    if (fullSerialized.length < 2_500_000) {
      localStorage.setItem(STORAGE_KEY, fullSerialized);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coreState));
    }
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coreState));
    } catch {
      // Ignore storage errors silently
    }
  }
}

export function buildExportJson(state: AppState): GuildWarExportSchema {
  const byType = (type: MapIconType) =>
    state.placedIcons.filter((icon) => icon.type === type);

  const groupsMap = new Map<string, string[]>();
  state.players.forEach((p) => {
    const key = p.team?.trim() || 'Unassigned';
    const arr = groupsMap.get(key) ?? [];
    arr.push(p.id);
    groupsMap.set(key, arr);
  });

  const groups = Array.from(groupsMap.entries()).map(([teamKey, memberIds]) => ({
    teamKey,
    teamName: state.teamNames[teamKey] || teamKey,
    memberIds,
  }));

  const bosses = byType('boss');

  return {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    players: state.players,
    individuals: state.placedPlayers,
    placedSquads: state.placedSquads,
    groups,
    objectives: bosses,
    notes: state.notes,
    bosses,
    blueTowers: byType('blueTower'),
    redTowers: byType('redTower'),
    blueTrees: byType('blueTree'),
    redTrees: byType('redTree'),
    blueGeese: byType('blueGoose'),
    redGeese: byType('redGoose'),
    arrows: state.arrows,
    enemies: byType('enemy'),
    drawings: state.drawings,
    teamNames: state.teamNames,
    weaponIcons: state.weaponIcons,
    pathIcons: state.pathIcons,
    roleIcons: state.roleIcons,
    roleIconColors: state.roleIconColors,
    mapObjectIcons: state.mapObjectIcons,
    mapObjectIconColors: state.mapObjectIconColors,
    mapType: state.mapType,
    customMapImage: state.customMapImage,
  };
}

function normalizeIconList(
  items: unknown,
  fallbackType: MapIconType
): PlacedIcon[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: typeof item.id === 'string' ? item.id : `${fallbackType}-${Date.now()}-${idx}`,
      type:
        typeof item.type === 'string' &&
        [
          'blueTower',
          'redTower',
          'blueTree',
          'redTree',
          'blueGoose',
          'redGoose',
          'boss',
          'enemy',
        ].includes(item.type)
          ? (item.type as MapIconType)
          : fallbackType,
      x: typeof item.x === 'number' ? item.x : 600,
      y: typeof item.y === 'number' ? item.y : 450,
      label: typeof item.label === 'string' ? item.label : undefined,
    }));
}

function normalizeAssetIcons(items: unknown, prefix: string): AssetIcon[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (w): w is Record<string, unknown> =>
        Boolean(
          w &&
            typeof w === 'object' &&
            typeof (w as { name?: unknown }).name === 'string' &&
            typeof (w as { imageDataUrl?: unknown }).imageDataUrl === 'string'
        )
    )
    .map((w, idx) => ({
      id: typeof w.id === 'string' ? w.id : `${prefix}-${Date.now()}-${idx}`,
      name: String(w.name),
      imageDataUrl: String(w.imageDataUrl),
      linkedWeapons: Array.isArray(w.linkedWeapons)
        ? w.linkedWeapons.map((x) => String(x))
        : undefined,
      linkedPath: typeof w.linkedPath === 'string' ? w.linkedPath : undefined,
      accentColor: typeof w.accentColor === 'string' ? w.accentColor : undefined,
    }));
}

export function parseImportedJson(rawText: string): AppState {
  const data = JSON.parse(rawText) as Record<string, unknown>;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Guild War JSON structure.');
  }

  const players: Player[] = Array.isArray(data.players)
    ? data.players
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p, idx) => {
          const roleVal = String(p.role || 'DPS');
          const validRole = ['DPS', 'Tank', 'Healer', 'Support'].includes(roleVal)
            ? (roleVal as Player['role'])
            : 'DPS';
          return {
            id: typeof p.id === 'string' ? p.id : `imp-p-${Date.now()}-${idx}`,
            name: typeof p.name === 'string' ? p.name : `Player ${idx + 1}`,
            role: validRole,
            team: typeof p.team === 'string' ? p.team : '',
            weapon1: typeof p.weapon1 === 'string' ? p.weapon1 : '',
            weapon2: typeof p.weapon2 === 'string' ? p.weapon2 : '',
            path1: typeof p.path1 === 'string' ? p.path1 : '',
            path2: typeof p.path2 === 'string' ? p.path2 : '',
          };
        })
    : [];

  const individualsRaw = Array.isArray(data.individuals) ? data.individuals : [];
  const placedPlayers: PlacedPlayer[] = individualsRaw
    .filter((ind): ind is Record<string, unknown> => Boolean(ind && typeof ind === 'object'))
    .map((ind, idx) => {
      const matched = players.find((p) => p.id === ind.playerId || p.id === ind.id);
      const roleVal = String(ind.role || matched?.role || 'DPS');
      const validRole = ['DPS', 'Tank', 'Healer', 'Support'].includes(roleVal)
        ? (roleVal as Player['role'])
        : 'DPS';
      return {
        id: typeof ind.id === 'string' ? ind.id : `imp-ind-${Date.now()}-${idx}`,
        playerId:
          typeof ind.playerId === 'string'
            ? ind.playerId
            : matched?.id || `imp-p-${idx}`,
        name: typeof ind.name === 'string' ? ind.name : matched?.name || `Unit ${idx + 1}`,
        role: validRole,
        team: typeof ind.team === 'string' ? ind.team : matched?.team || '',
        weapon1: typeof ind.weapon1 === 'string' ? ind.weapon1 : matched?.weapon1 || '',
        weapon2: typeof ind.weapon2 === 'string' ? ind.weapon2 : matched?.weapon2 || '',
        path1: typeof ind.path1 === 'string' ? ind.path1 : matched?.path1 || '',
        path2: typeof ind.path2 === 'string' ? ind.path2 : matched?.path2 || '',
        x: typeof ind.x === 'number' ? ind.x : 600,
        y: typeof ind.y === 'number' ? ind.y : 450,
      };
    });

  const placedSquads: PlacedSquad[] = Array.isArray(data.placedSquads)
    ? data.placedSquads
        .filter((sq): sq is Record<string, unknown> => Boolean(sq && typeof sq === 'object'))
        .map((sq, idx) => ({
          id: typeof sq.id === 'string' ? sq.id : `imp-sq-${Date.now()}-${idx}`,
          teamKey: typeof sq.teamKey === 'string' ? sq.teamKey : 'Unassigned',
          x: typeof sq.x === 'number' ? sq.x : 600,
          y: typeof sq.y === 'number' ? sq.y : 450,
          isExpanded: Boolean(sq.isExpanded),
        }))
    : [];

  const bossesList = normalizeIconList(data.bosses, 'boss');
  const objectivesList = normalizeIconList(data.objectives, 'boss');
  const mergedBossesMap = new Map<string, PlacedIcon>();
  [...bossesList, ...objectivesList].forEach((b) => mergedBossesMap.set(b.id, b));

  const placedIcons: PlacedIcon[] = [
    ...normalizeIconList(data.blueTowers, 'blueTower'),
    ...normalizeIconList(data.redTowers, 'redTower'),
    ...normalizeIconList(data.blueTrees, 'blueTree'),
    ...normalizeIconList(data.redTrees, 'redTree'),
    ...normalizeIconList(data.blueGeese, 'blueGoose'),
    ...normalizeIconList(data.redGeese, 'redGoose'),
    ...Array.from(mergedBossesMap.values()),
    ...normalizeIconList(data.enemies, 'enemy'),
  ];

  const arrows: DrawingArrow[] = Array.isArray(data.arrows)
    ? data.arrows
        .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
        .map((a, idx) => ({
          id: typeof a.id === 'string' ? a.id : `arr-${Date.now()}-${idx}`,
          x1: typeof a.x1 === 'number' ? a.x1 : 500,
          y1: typeof a.y1 === 'number' ? a.y1 : 450,
          x2: typeof a.x2 === 'number' ? a.x2 : 700,
          y2: typeof a.y2 === 'number' ? a.y2 : 450,
          color: typeof a.color === 'string' ? a.color : '#3b82f6',
        }))
    : [];

  const drawings: DrawingPath[] = Array.isArray(data.drawings)
    ? data.drawings
        .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === 'object'))
        .map((d, idx) => ({
          id: typeof d.id === 'string' ? d.id : `drw-${Date.now()}-${idx}`,
          points: Array.isArray(d.points)
            ? d.points
                .filter(
                  (pt): pt is { x: number; y: number } =>
                    Boolean(
                      pt &&
                        typeof pt === 'object' &&
                        typeof (pt as { x?: unknown }).x === 'number' &&
                        typeof (pt as { y?: unknown }).y === 'number'
                    )
                )
            : [],
          color: typeof d.color === 'string' ? d.color : '#f59e0b',
          width: typeof d.width === 'number' ? d.width : 3,
        }))
        .filter((d) => d.points.length > 1)
    : [];

  const notes: TacticalNote[] = Array.isArray(data.notes)
    ? data.notes
        .filter((n): n is Record<string, unknown> => Boolean(n && typeof n === 'object'))
        .map((n, idx) => ({
          id: typeof n.id === 'string' ? n.id : `note-${Date.now()}-${idx}`,
          x: typeof n.x === 'number' ? n.x : 600,
          y: typeof n.y === 'number' ? n.y : 450,
          text: typeof n.text === 'string' ? n.text : 'Tactical Note',
          color: typeof n.color === 'string' ? n.color : '#f59e0b',
        }))
    : [];

  const teamNames: Record<string, string> =
    data.teamNames && typeof data.teamNames === 'object' && !Array.isArray(data.teamNames)
      ? Object.fromEntries(
          Object.entries(data.teamNames as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v ?? k),
          ])
        )
      : {};

  const mapType =
    data.mapType === 'fortress' || data.mapType === 'grid' || data.mapType === 'custom'
      ? data.mapType
      : 'fortress';

  const customMapImage =
    typeof data.customMapImage === 'string' ? data.customMapImage : null;

  const weaponIcons = normalizeAssetIcons(data.weaponIcons, 'wpn');
  const pathIcons = normalizeAssetIcons(data.pathIcons, 'path');
  const roleIcons = normalizeIconRecord(data.roleIcons, VALID_ROLES);
  const roleIconColors = normalizeIconRecord(data.roleIconColors, VALID_ROLES);
  const mapObjectIcons = normalizeIconRecord(data.mapObjectIcons, VALID_MAP_ICON_TYPES);
  const mapObjectIconColors = normalizeIconRecord(data.mapObjectIconColors, VALID_MAP_ICON_TYPES);

  return {
    players,
    placedPlayers,
    placedSquads,
    placedIcons,
    arrows,
    drawings,
    notes,
    teamNames,
    weaponIcons,
    pathIcons,
    roleIcons,
    roleIconColors,
    mapObjectIcons,
    mapObjectIconColors,
    mapType,
    customMapImage,
  };
}

export function extractNameFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  return withoutExt.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export function findAssetIcon(
  name: string | undefined,
  icons: AssetIcon[]
): AssetIcon | undefined {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;
  return icons.find((w) => w.name.trim().toLowerCase() === normalized);
}

// Backwards-compatible alias
export const findWeaponIcon = findAssetIcon;

function createUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

export function extractDominantColorFromImage(img: HTMLImageElement): string {
  try {
    const size = 40;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#38bdf8';

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    const buckets = new Map<
      string,
      { r: number; g: number; b: number; weight: number }
    >();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 80) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;
      const brightness = (r + g + b) / 3;

      // Skip very dark background or pure white highlights
      if (brightness < 35) continue;
      if (brightness > 240 && sat < 25) continue;

      const br = Math.round(r / 24) * 24;
      const bg = Math.round(g / 24) * 24;
      const bb = Math.round(b / 24) * 24;
      const key = `${br},${bg},${bb}`;
      const weight = (sat * 2.5 + 15) * (a / 255);

      const prev = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0 };
      buckets.set(key, {
        r: prev.r + r * weight,
        g: prev.g + g * weight,
        b: prev.b + b * weight,
        weight: prev.weight + weight,
      });
    }

    if (buckets.size === 0) return '#94a3b8';

    let best = { r: 148, g: 163, b: 184, weight: 0 };
    for (const bucket of buckets.values()) {
      if (bucket.weight > best.weight) {
        best = bucket;
      }
    }

    let fr = best.r / best.weight;
    let fg = best.g / best.weight;
    let fb = best.b / best.weight;

    // Ensure border color has crisp visibility on dark slate
    const lum = 0.299 * fr + 0.587 * fg + 0.114 * fb;
    if (lum < 95) {
      const boost = 95 / Math.max(lum, 20);
      fr = Math.min(255, fr * Math.min(boost, 1.8));
      fg = Math.min(255, fg * Math.min(boost, 1.8));
      fb = Math.min(255, fb * Math.min(boost, 1.8));
    }

    return `#${toHex(fr)}${toHex(fg)}${toHex(fb)}`;
  } catch {
    return '#38bdf8';
  }
}

export function extractDominantColorFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(extractDominantColorFromImage(img));
    img.onerror = () => resolve('#38bdf8');
    img.src = dataUrl;
  });
}

export function processAssetIconFile(file: File, prefix = 'asset'): Promise<AssetIcon> {
  return new Promise((resolve, reject) => {
    const name = extractNameFromFilename(file.name) || 'Icon';
    const id = createUniqueId(prefix);
    const reader = new FileReader();

    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawUrl) {
        reject(new Error(`Empty file: ${file.name}`));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const accentColor = extractDominantColorFromImage(img);

        if (
          (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) &&
          rawUrl.length < 32_000
        ) {
          resolve({ id, name, imageDataUrl: rawUrl, accentColor });
          return;
        }

        const size = 80;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ id, name, imageDataUrl: rawUrl, accentColor });
          return;
        }
        const scale = Math.min(size / (img.width || size), size / (img.height || size));
        const w = (img.width || size) * scale;
        const h = (img.height || size) * scale;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve({
          id,
          name,
          imageDataUrl: canvas.toDataURL('image/png'),
          accentColor,
        });
      };
      img.onerror = () => resolve({ id, name, imageDataUrl: rawUrl, accentColor: '#38bdf8' });
      img.src = rawUrl;
    };

    reader.readAsDataURL(file);
  });
}

export interface RelativeImageFile {
  file: File;
  relativePath: string;
}

export interface DetectedPathBundle {
  folderKey: string;
  folderName: string;
  pathIcon: AssetIcon;
  weaponIcons: AssetIcon[];
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
}

export async function detectPathBundlesFromFiles(
  items: RelativeImageFile[]
): Promise<DetectedPathBundle[]> {
  const imageItems = items.filter((item) => isImageFile(item.file));
  const folderMap = new Map<string, { folderName: string; files: File[] }>();

  imageItems.forEach(({ file, relativePath }) => {
    const cleanPath = relativePath.replace(/^\/+/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    // Use immediate parent folder name, or fallback to 'Uploaded Path'
    const folderKey = parts.length >= 2 ? parts.slice(0, -1).join('/') : 'root';
    const rawFolderName = parts.length >= 2 ? parts[parts.length - 2] : 'Uploaded Path';
    const folderName = rawFolderName.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

    const entry = folderMap.get(folderKey) ?? { folderName, files: [] };
    entry.files.push(file);
    folderMap.set(folderKey, entry);
  });

  const bundles: DetectedPathBundle[] = [];

  for (const [folderKey, group] of folderMap.entries()) {
    if (group.files.length === 0) continue;

    // Process all images in this folder
    const processed = await Promise.all(
      group.files.map((f) => processAssetIconFile(f, 'item'))
    );

    const normalizedFolder = normalizeForMatch(group.folderName);

    // Heuristic 1: Exact or normalized match with folder name
    let pathIndex = processed.findIndex(
      (item) => normalizeForMatch(item.name) === normalizedFolder
    );

    // Heuristic 2: Filename contains folder name or vice versa
    if (pathIndex < 0 && normalizedFolder.length >= 3) {
      pathIndex = processed.findIndex((item) => {
        const n = normalizeForMatch(item.name);
        return n.includes(normalizedFolder) || normalizedFolder.includes(n);
      });
    }

    // Heuristic 3: Filename contains "path" or "logo"
    if (pathIndex < 0) {
      pathIndex = processed.findIndex((item) =>
        /\b(path|logo|icon_path)\b/i.test(item.name)
      );
    }

    // Fallback: first file in folder
    if (pathIndex < 0) {
      pathIndex = 0;
    }

    const chosenPathRaw = processed[pathIndex];
    const resolvedPathName =
      group.folderName !== 'Uploaded Path' &&
      /\b(path|logo)\b/i.test(chosenPathRaw.name) &&
      normalizeForMatch(chosenPathRaw.name) !== normalizedFolder
        ? group.folderName
        : chosenPathRaw.name;

    const remainingWeapons = processed
      .filter((_, idx) => idx !== pathIndex)
      .map((w) => ({
        ...w,
        id: w.id.replace(/^item-/, 'wpn-'),
        linkedPath: resolvedPathName,
      }));

    const pathIcon: AssetIcon = {
      ...chosenPathRaw,
      id: chosenPathRaw.id.replace(/^item-/, 'path-'),
      name: resolvedPathName,
      linkedWeapons: remainingWeapons.map((w) => w.name),
    };

    bundles.push({
      folderKey,
      folderName: group.folderName,
      pathIcon,
      weaponIcons: remainingWeapons,
    });
  }

  return bundles;
}

async function readEntryRecursively(entry: FileSystemEntry): Promise<RelativeImageFile[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fileEntry.file(
        (file) => {
          resolve([{ file, relativePath: entry.fullPath || file.name }]);
        },
        () => resolve([])
      );
    });
  }
  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const allEntries: FileSystemEntry[] = [];
    await new Promise<void>((resolve) => {
      const readBatch = () => {
        reader.readEntries(
          (batch) => {
            if (batch.length === 0) {
              resolve();
            } else {
              allEntries.push(...batch);
              readBatch();
            }
          },
          () => resolve()
        );
      };
      readBatch();
    });
    const nested = await Promise.all(allEntries.map(readEntryRecursively));
    return nested.flat();
  }
  return [];
}

export async function extractRelativeFilesFromDrop(
  dataTransfer: DataTransfer
): Promise<RelativeImageFile[]> {
  const items = Array.from(dataTransfer.items || []);
  const entries = items
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((e): e is FileSystemEntry => Boolean(e));

  if (entries.length > 0) {
    const nested = await Promise.all(entries.map(readEntryRecursively));
    return nested.flat();
  }

  return Array.from(dataTransfer.files || []).map((file) => ({
    file,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

export async function processSingleIconWithColor(
  file: File
): Promise<{ imageDataUrl: string; accentColor: string }> {
  const asset = await processAssetIconFile(file, 'sys');
  return {
    imageDataUrl: asset.imageDataUrl,
    accentColor: asset.accentColor || '#38bdf8',
  };
}

export async function processSingleIconDataUrl(file: File): Promise<string> {
  const asset = await processAssetIconFile(file, 'sys');
  return asset.imageDataUrl;
}

export interface AutoMatchedSystemIconsResult {
  matchedRoles: Partial<Record<PlayerRole, string>>;
  matchedRoleColors: Partial<Record<PlayerRole, string>>;
  matchedMapObjects: Partial<Record<MapIconType, string>>;
  matchedMapObjectColors: Partial<Record<MapIconType, string>>;
  matchedCount: number;
  unmatchedNames: string[];
}

export async function autoMatchSystemIconsFromFiles(
  fileList: FileList | File[]
): Promise<AutoMatchedSystemIconsResult> {
  const files = Array.from(fileList).filter((f) => isImageFile(f));
  const matchedRoles: Partial<Record<PlayerRole, string>> = {};
  const matchedRoleColors: Partial<Record<PlayerRole, string>> = {};
  const matchedMapObjects: Partial<Record<MapIconType, string>> = {};
  const matchedMapObjectColors: Partial<Record<MapIconType, string>> = {};
  const genericQueue: Array<{
    kind: 'tower' | 'tree' | 'goose';
    dataUrl: string;
    accentColor: string;
  }> = [];
  const unmatchedNames: string[] = [];
  let matchedCount = 0;

  for (const file of files) {
    const clean = extractNameFromFilename(file.name)
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const compact = clean.replace(/\s+/g, '');

    let dataUrl = '';
    let accentColor = '#38bdf8';
    try {
      const processed = await processSingleIconWithColor(file);
      dataUrl = processed.imageDataUrl;
      accentColor = processed.accentColor;
    } catch {
      unmatchedNames.push(file.name);
      continue;
    }

    const isBlue = /\b(blue|biru|ally)\b/.test(clean) || /^b(tower|tree|goose|geese)$/.test(compact);
    const isRed = /\b(red|merah|enemy)\b/.test(clean) || /^r(tower|tree|goose|geese)$/.test(compact);

    if (/\btower|menara\b/.test(clean) || compact.includes('tower')) {
      if (isBlue) {
        matchedMapObjects.blueTower = dataUrl;
        matchedMapObjectColors.blueTower = accentColor;
        matchedCount++;
      } else if (isRed) {
        matchedMapObjects.redTower = dataUrl;
        matchedMapObjectColors.redTower = accentColor;
        matchedCount++;
      } else {
        genericQueue.push({ kind: 'tower', dataUrl, accentColor });
        matchedCount++;
      }
      continue;
    }

    if (/\btree|pohon\b/.test(clean) || compact.includes('tree')) {
      if (isBlue) {
        matchedMapObjects.blueTree = dataUrl;
        matchedMapObjectColors.blueTree = accentColor;
        matchedCount++;
      } else if (isRed) {
        matchedMapObjects.redTree = dataUrl;
        matchedMapObjectColors.redTree = accentColor;
        matchedCount++;
      } else {
        genericQueue.push({ kind: 'tree', dataUrl, accentColor });
        matchedCount++;
      }
      continue;
    }

    if (/\b(goose|geese|angsa)\b/.test(clean) || compact.includes('goose') || compact.includes('geese')) {
      if (isBlue) {
        matchedMapObjects.blueGoose = dataUrl;
        matchedMapObjectColors.blueGoose = accentColor;
        matchedCount++;
      } else if (isRed) {
        matchedMapObjects.redGoose = dataUrl;
        matchedMapObjectColors.redGoose = accentColor;
        matchedCount++;
      } else {
        genericQueue.push({ kind: 'goose', dataUrl, accentColor });
        matchedCount++;
      }
      continue;
    }

    if (/\b(boss|objective|citadel|seal)\b/.test(clean)) {
      matchedMapObjects.boss = dataUrl;
      matchedMapObjectColors.boss = accentColor;
      matchedCount++;
      continue;
    }

    if (/\b(enemy|musuh|squad)\b/.test(clean)) {
      matchedMapObjects.enemy = dataUrl;
      matchedMapObjectColors.enemy = accentColor;
      matchedCount++;
      continue;
    }

    if (/\b(healer|heal)\b/.test(clean)) {
      matchedRoles.Healer = dataUrl;
      matchedRoleColors.Healer = accentColor;
      matchedCount++;
      continue;
    }

    if (/\btank\b/.test(clean)) {
      matchedRoles.Tank = dataUrl;
      matchedRoleColors.Tank = accentColor;
      matchedCount++;
      continue;
    }

    if (/\bdps\b/.test(clean)) {
      matchedRoles.DPS = dataUrl;
      matchedRoleColors.DPS = accentColor;
      matchedCount++;
      continue;
    }

    if (/\b(support|supp)\b/.test(clean)) {
      matchedRoles.Support = dataUrl;
      matchedRoleColors.Support = accentColor;
      matchedCount++;
      continue;
    }

    unmatchedNames.push(file.name);
  }

  // Apply generic (non-blue/red) tower/tree/goose icons to whichever slots were not explicitly matched
  for (const item of genericQueue) {
    if (item.kind === 'tower') {
      if (!matchedMapObjects.blueTower) {
        matchedMapObjects.blueTower = item.dataUrl;
        matchedMapObjectColors.blueTower = item.accentColor;
      }
      if (!matchedMapObjects.redTower) {
        matchedMapObjects.redTower = item.dataUrl;
        matchedMapObjectColors.redTower = item.accentColor;
      }
    } else if (item.kind === 'tree') {
      if (!matchedMapObjects.blueTree) {
        matchedMapObjects.blueTree = item.dataUrl;
        matchedMapObjectColors.blueTree = item.accentColor;
      }
      if (!matchedMapObjects.redTree) {
        matchedMapObjects.redTree = item.dataUrl;
        matchedMapObjectColors.redTree = item.accentColor;
      }
    } else if (item.kind === 'goose') {
      if (!matchedMapObjects.blueGoose) {
        matchedMapObjects.blueGoose = item.dataUrl;
        matchedMapObjectColors.blueGoose = item.accentColor;
      }
      if (!matchedMapObjects.redGoose) {
        matchedMapObjects.redGoose = item.dataUrl;
        matchedMapObjectColors.redGoose = item.accentColor;
      }
    }
  }

  return {
    matchedRoles,
    matchedRoleColors,
    matchedMapObjects,
    matchedMapObjectColors,
    matchedCount,
    unmatchedNames,
  };
}

