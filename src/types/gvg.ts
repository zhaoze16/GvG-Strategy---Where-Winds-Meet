export type PlayerRole = 'DPS' | 'Tank' | 'Healer' | 'Support';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  team: string;
  weapon1: string;
  weapon2: string;
  path1?: string;
  path2?: string;
}

export type MapIconType =
  | 'blueTower'
  | 'redTower'
  | 'blueTree'
  | 'redTree'
  | 'blueGoose'
  | 'redGoose'
  | 'boss'
  | 'enemy';

export interface PlacedIcon {
  id: string;
  type: MapIconType;
  x: number;
  y: number;
  label?: string;
}

export interface PlacedPlayer {
  id: string;
  playerId: string;
  name: string;
  role: PlayerRole;
  team: string;
  weapon1: string;
  weapon2: string;
  path1?: string;
  path2?: string;
  x: number;
  y: number;
}

export interface DrawingArrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width?: number;
}

export interface TacticalNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export type MapType = 'fortress' | 'grid' | 'custom';
export type ToolMode = 'select' | 'arrow' | 'pen' | 'note';
export type SidebarTab = 'objects' | 'squads' | 'draw';

export interface AssetIcon {
  id: string;
  name: string;
  imageDataUrl: string;
  linkedWeapons?: string[];
  linkedPath?: string;
  accentColor?: string;
}

export type WeaponIcon = AssetIcon;
export type PathIcon = AssetIcon;

export interface AppState {
  players: Player[];
  placedPlayers: PlacedPlayer[];
  placedIcons: PlacedIcon[];
  arrows: DrawingArrow[];
  drawings: DrawingPath[];
  notes: TacticalNote[];
  teamNames: Record<string, string>;
  weaponIcons: WeaponIcon[];
  pathIcons: PathIcon[];
  roleIcons: Partial<Record<PlayerRole, string>>;
  roleIconColors: Partial<Record<PlayerRole, string>>;
  mapObjectIcons: Partial<Record<MapIconType, string>>;
  mapObjectIconColors: Partial<Record<MapIconType, string>>;
  mapType: MapType;
  customMapImage: string | null;
}

export interface GuildWarExportSchema {
  version: string;
  exportDate: string;
  players: Player[];
  individuals: PlacedPlayer[];
  groups: Array<{
    teamKey: string;
    teamName: string;
    memberIds: string[];
  }>;
  objectives: PlacedIcon[];
  notes: TacticalNote[];
  bosses: PlacedIcon[];
  blueTowers: PlacedIcon[];
  redTowers: PlacedIcon[];
  blueTrees: PlacedIcon[];
  redTrees: PlacedIcon[];
  blueGeese: PlacedIcon[];
  redGeese: PlacedIcon[];
  arrows: DrawingArrow[];
  enemies: PlacedIcon[];
  drawings: DrawingPath[];
  teamNames: Record<string, string>;
  weaponIcons?: WeaponIcon[];
  pathIcons?: PathIcon[];
  roleIcons?: Partial<Record<PlayerRole, string>>;
  roleIconColors?: Partial<Record<PlayerRole, string>>;
  mapObjectIcons?: Partial<Record<MapIconType, string>>;
  mapObjectIconColors?: Partial<Record<MapIconType, string>>;
  mapType?: MapType;
  customMapImage?: string | null;
}
