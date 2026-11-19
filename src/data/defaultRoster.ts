import { MapIconType, Player, PlayerRole } from '../types/gvg';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 900;

export const ROLE_META: Record<
  PlayerRole,
  {
    label: string;
    faIcon: string;
    borderHex: string;
    bgHex: string;
    textHex: string;
    badgeClasses: string;
  }
> = {
  DPS: {
    label: 'DPS',
    faIcon: 'fa-solid fa-crosshairs',
    borderHex: '#f43f5e',
    bgHex: '#4c0519',
    textHex: '#fda4af',
    badgeClasses: 'text-rose-300 bg-rose-950/80 border-rose-500/60',
  },
  Tank: {
    label: 'Tank',
    faIcon: 'fa-solid fa-shield-halved',
    borderHex: '#f59e0b',
    bgHex: '#451a03',
    textHex: '#fcd34d',
    badgeClasses: 'text-amber-300 bg-amber-950/80 border-amber-500/60',
  },
  Healer: {
    label: 'Healer',
    faIcon: 'fa-solid fa-kit-medical',
    borderHex: '#10b981',
    bgHex: '#022c22',
    textHex: '#6ee7b7',
    badgeClasses: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/60',
  },
  Support: {
    label: 'Support',
    faIcon: 'fa-solid fa-wand-magic-sparkles',
    borderHex: '#38bdf8',
    bgHex: '#082f49',
    textHex: '#7dd3fc',
    badgeClasses: 'text-sky-300 bg-sky-950/80 border-sky-500/60',
  },
};

export interface MapIconMeta {
  type: MapIconType;
  label: string;
  shortLabel: string;
  faIcon: string;
  borderHex: string;
  bgHex: string;
  accentHex: string;
  faction: 'blue' | 'red' | 'neutral';
}

export const MAP_ICONS_META: Record<MapIconType, MapIconMeta> = {
  blueTower: {
    type: 'blueTower',
    label: 'Blue Tower',
    shortLabel: 'B-Tower',
    faIcon: 'fa-solid fa-chess-rook',
    borderHex: '#3b82f6',
    bgHex: '#172554',
    accentHex: '#93c5fd',
    faction: 'blue',
  },
  redTower: {
    type: 'redTower',
    label: 'Red Tower',
    shortLabel: 'R-Tower',
    faIcon: 'fa-solid fa-chess-rook',
    borderHex: '#ef4444',
    bgHex: '#450a0a',
    accentHex: '#fca5a5',
    faction: 'red',
  },
  blueTree: {
    type: 'blueTree',
    label: 'Blue Tree',
    shortLabel: 'B-Tree',
    faIcon: 'fa-solid fa-tree',
    borderHex: '#2563eb',
    bgHex: '#1e3a8a',
    accentHex: '#60a5fa',
    faction: 'blue',
  },
  redTree: {
    type: 'redTree',
    label: 'Red Tree',
    shortLabel: 'R-Tree',
    faIcon: 'fa-solid fa-tree',
    borderHex: '#dc2626',
    bgHex: '#7f1d1d',
    accentHex: '#f87171',
    faction: 'red',
  },
  blueGoose: {
    type: 'blueGoose',
    label: 'Blue Goose',
    shortLabel: 'B-Goose',
    faIcon: 'fa-solid fa-feather-pointed',
    borderHex: '#0ea5e9',
    bgHex: '#0c4a6e',
    accentHex: '#7dd3fc',
    faction: 'blue',
  },
  redGoose: {
    type: 'redGoose',
    label: 'Red Goose',
    shortLabel: 'R-Goose',
    faIcon: 'fa-solid fa-feather-pointed',
    borderHex: '#f97316',
    bgHex: '#7c2d12',
    accentHex: '#fdba74',
    faction: 'red',
  },
  boss: {
    type: 'boss',
    label: 'Epic Boss / Objective',
    shortLabel: 'Objective',
    faIcon: 'fa-solid fa-crown',
    borderHex: '#f59e0b',
    bgHex: '#451a03',
    accentHex: '#fde68a',
    faction: 'neutral',
  },
  enemy: {
    type: 'enemy',
    label: 'Enemy Squad',
    shortLabel: 'Enemy',
    faIcon: 'fa-solid fa-skull-crossbones',
    borderHex: '#e11d48',
    bgHex: '#4c0519',
    accentHex: '#fda4af',
    faction: 'red',
  },
};

export const TACTICAL_COLORS = [
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'red', label: 'Red', hex: '#ef4444' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'yellow', label: 'Yellow', hex: '#f59e0b' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'white', label: 'White', hex: '#f8fafc' },
] as const;

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'p-101', name: 'Kaelen', role: 'Tank', team: 'Vanguard', weapon1: 'Mo Blade', weapon2: 'Spear' },
  { id: 'p-102', name: 'Ironclad', role: 'Tank', team: 'Vanguard', weapon1: 'Glaive', weapon2: 'Tower Shield' },
  { id: 'p-103', name: 'Seraphina', role: 'Healer', team: 'Vanguard', weapon1: 'Panacea Fan', weapon2: 'Soul Umbrella' },
  { id: 'p-104', name: 'Vexis', role: 'DPS', team: 'Vanguard', weapon1: 'Twin Blades', weapon2: 'Rope Dart' },
  { id: 'p-105', name: 'Draven', role: 'DPS', team: 'Vanguard', weapon1: 'Longsword', weapon2: 'Spear' },

  { id: 'p-106', name: 'Nyx', role: 'DPS', team: 'Flank Squad', weapon1: 'Twin Blades', weapon2: 'Throwing Knives' },
  { id: 'p-107', name: 'Kurogane', role: 'DPS', team: 'Flank Squad', weapon1: 'Katana', weapon2: 'Rope Dart' },
  { id: 'p-108', name: 'Lyra', role: 'Support', team: 'Flank Squad', weapon1: 'Ink Fan', weapon2: 'Umbrella' },
  { id: 'p-109', name: 'Orin', role: 'Healer', team: 'Flank Squad', weapon1: 'Panacea Fan', weapon2: 'Flute' },
  { id: 'p-110', name: 'Zarek', role: 'DPS', team: 'Flank Squad', weapon1: 'Spear', weapon2: 'Bow' },

  { id: 'p-111', name: 'Aurelia', role: 'Healer', team: 'Citadel Guard', weapon1: 'Soul Umbrella', weapon2: 'Panacea Fan' },
  { id: 'p-112', name: 'Thane', role: 'Tank', team: 'Citadel Guard', weapon1: 'Mo Blade', weapon2: 'Heavy Shield' },
  { id: 'p-113', name: 'Soren', role: 'Support', team: 'Citadel Guard', weapon1: 'War Drum', weapon2: 'Ink Fan' },
  { id: 'p-114', name: 'Mireille', role: 'DPS', team: 'Citadel Guard', weapon1: 'Longsword', weapon2: 'Bow' },

  { id: 'p-115', name: 'Caspian', role: 'DPS', team: '', weapon1: 'Twin Blades', weapon2: 'Spear' },
  { id: 'p-116', name: 'Elowen', role: 'Support', team: '', weapon1: 'Umbrella', weapon2: 'Fan' },
];
