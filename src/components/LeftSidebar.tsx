import React, { useMemo, useRef, useState } from 'react';
import { MAP_ICONS_META, ROLE_META, TACTICAL_COLORS } from '../data/defaultRoster';
import {
  MapIconType,
  PathIcon,
  PlacedPlayer,
  PlacedSquad,
  Player,
  PlayerRole,
  SidebarTab,
  ToolMode,
  WeaponIcon,
} from '../types/gvg';
import { findAssetIcon } from '../utils/storageAndSchema';

interface LeftSidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  players: Player[];
  placedPlayers: PlacedPlayer[];
  placedSquads: PlacedSquad[];
  weaponIcons: WeaponIcon[];
  pathIcons: PathIcon[];
  roleIcons: Partial<Record<PlayerRole, string>>;
  roleIconColors: Partial<Record<PlayerRole, string>>;
  mapObjectIcons: Partial<Record<MapIconType, string>>;
  mapObjectIconColors: Partial<Record<MapIconType, string>>;
  teamNames: Record<string, string>;
  toolMode: ToolMode;
  activeColor: string;
  hasAnnotations: boolean;
  onSpawnIconCenter: (type: MapIconType) => void;
  onSpawnPlayerCenter: (player: Player) => void;
  onDeploySquad: (teamKey: string, members: Player[]) => void;
  onRecallSquad: (teamKey: string, members: Player[]) => void;
  onRenameTeam: (teamKey: string, newName: string) => void;
  onToolModeChange: (mode: ToolMode) => void;
  onColorChange: (hex: string) => void;
  onUndoAnnotation: () => void;
  onClearAllAnnotations: () => void;
  onOpenIconsManager: () => void;
  onQuickUploadMapObjectIcon: (type: MapIconType, file: File) => void;
}

const SPAWN_ORDER: MapIconType[] = [
  'blueTower',
  'redTower',
  'blueTree',
  'redTree',
  'blueGoose',
  'redGoose',
  'boss',
  'enemy',
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onTabChange,
  players,
  placedPlayers,
  placedSquads,
  weaponIcons,
  pathIcons,
  roleIcons,
  roleIconColors,
  mapObjectIcons,
  mapObjectIconColors,
  teamNames,
  toolMode,
  activeColor,
  hasAnnotations,
  onSpawnIconCenter,
  onSpawnPlayerCenter,
  onDeploySquad,
  onRecallSquad,
  onRenameTeam,
  onToolModeChange,
  onColorChange,
  onUndoAnnotation,
  onClearAllAnnotations,
  onOpenIconsManager,
  onQuickUploadMapObjectIcon,
}) => {
  const [unitSearch, setUnitSearch] = useState('');
  const [editingTeamKey, setEditingTeamKey] = useState<string | null>(null);
  const [teamDraftName, setTeamDraftName] = useState('');
  const quickFileInputRef = useRef<HTMLInputElement>(null);
  const quickTargetTypeRef = useRef<MapIconType | null>(null);

  const placedPlayerIds = useMemo(
    () => new Set(placedPlayers.map((p) => p.playerId)),
    [placedPlayers]
  );

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.weapon1.toLowerCase().includes(q) ||
        p.weapon2.toLowerCase().includes(q)
    );
  }, [players, unitSearch]);

  const groupedSquads = useMemo(() => {
    const map = new Map<string, Player[]>();
    players.forEach((p) => {
      const key = p.team.trim() || 'Unassigned';
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    });

    const entries = Array.from(map.entries());
    entries.sort(([a], [b]) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [players]);

  const startDragIcon = (e: React.DragEvent, type: MapIconType) => {
    e.dataTransfer.setData('application/gvg-icon', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const startDragPlayer = (e: React.DragEvent, player: Player) => {
    e.dataTransfer.setData('application/gvg-player', JSON.stringify(player));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      {/* 3 Functional Tabs */}
      <div className="grid grid-cols-3 gap-1 border-b border-slate-800 bg-slate-950/60 p-1.5">
        <button
          type="button"
          onClick={() => onTabChange('objects')}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'objects'
              ? 'bg-slate-800 text-amber-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <i className="fa-solid fa-cubes" aria-hidden="true" />
          <span>Objects</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('squads')}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'squads'
              ? 'bg-slate-800 text-amber-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <i className="fa-solid fa-people-group" aria-hidden="true" />
          <span>Squads</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('draw')}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'draw'
              ? 'bg-slate-800 text-amber-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <i className="fa-solid fa-pen-ruler" aria-hidden="true" />
          <span>Draw</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'objects' && (
          <>
            {/* Tactical Icons Spawner */}
            <section>
              <input
                ref={quickFileInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  const targetType = quickTargetTypeRef.current;
                  if (file && targetType) {
                    onQuickUploadMapObjectIcon(targetType, file);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />

              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-semibold text-slate-100">
                  Map Objects &amp; Spawner
                </h2>
                <button
                  type="button"
                  onClick={onOpenIconsManager}
                  title="Customize Role (Tank, Healer, DPS) & Map Object Icons"
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-950/90 px-2 py-0.5 text-[10px] font-medium text-amber-300 hover:border-amber-500/60 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-icons text-[10px]" aria-hidden="true" />
                  <span>Ganti Icon</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SPAWN_ORDER.map((type) => {
                  const meta = MAP_ICONS_META[type];
                  const customIconUrl = mapObjectIcons[type];
                  return (
                    <div
                      key={type}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => startDragIcon(e, type)}
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes('Files')) {
                          e.preventDefault();
                        }
                      }}
                      onDrop={(e) => {
                        const droppedFile = e.dataTransfer.files?.[0];
                        if (droppedFile && droppedFile.type.startsWith('image/')) {
                          e.preventDefault();
                          e.stopPropagation();
                          onQuickUploadMapObjectIcon(type, droppedFile);
                        }
                      }}
                      onClick={() => onSpawnIconCenter(type)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSpawnIconCenter(type);
                        }
                      }}
                      title={`Click/drag to spawn ${meta.label} (or drop an image / click icon button to replace)`}
                      className="group relative flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-left hover:border-slate-600 hover:bg-slate-800/80 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md overflow-hidden"
                        style={{
                          backgroundColor: customIconUrl ? 'transparent' : meta.bgHex,
                          color: meta.accentHex,
                        }}
                      >
                        {customIconUrl ? (
                          <img
                            src={customIconUrl}
                            alt={meta.label}
                            referrerPolicy="no-referrer"
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <i className={`${meta.faIcon} text-xs`} aria-hidden="true" />
                        )}
                      </span>
                      <span className="truncate text-xs font-medium text-slate-200 group-hover:text-white pr-3">
                        {meta.label}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          quickTargetTypeRef.current = type;
                          quickFileInputRef.current?.click();
                        }}
                        title={`Replace ${meta.label} icon`}
                        aria-label={`Replace ${meta.label} icon`}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded border border-slate-700 bg-slate-900/95 text-slate-400 opacity-0 group-hover:opacity-100 hover:border-amber-500/60 hover:text-amber-300 transition-opacity cursor-pointer"
                      >
                        <i className="fa-solid fa-pen text-[9px]" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-slate-800" />

            {/* Draggable Squad Units List */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-slate-100">
                  Squad Units
                </h2>
                <span className="font-mono-tabular text-xs text-slate-400">
                  {placedPlayers.length}/{players.length} placed
                </span>
              </div>

              <div className="relative">
                <i
                  className="fa-solid fa-magnifying-glass pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Filter units by name, role, weapon..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {filteredUnits.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-center text-xs text-slate-400">
                  No units match your search. Open Manage Roster to add members.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredUnits.map((player) => {
                    const roleMeta = ROLE_META[player.role];
                    const isPlaced = placedPlayerIds.has(player.id);
                    return (
                      <div
                        key={player.id}
                        draggable
                        onDragStart={(e) => startDragPlayer(e, player)}
                        onClick={() => onSpawnPlayerCenter(player)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSpawnPlayerCenter(player);
                          }
                        }}
                        title="Drag onto map coordinates or click to spawn at center"
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/75 px-2.5 py-2 hover:border-blue-500/50 hover:bg-slate-800/70 transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md overflow-hidden"
                            style={{
                              backgroundColor: roleIcons[player.role] ? 'transparent' : roleMeta.bgHex,
                              color: roleMeta.textHex,
                            }}
                          >
                            {roleIcons[player.role] ? (
                              <img
                                src={roleIcons[player.role]}
                                alt={player.role}
                                referrerPolicy="no-referrer"
                                className="h-6 w-6 object-contain"
                              />
                            ) : (
                              <i className={`${roleMeta.faIcon} text-xs`} aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-semibold text-slate-100">
                                {player.name}
                              </span>
                              {isPlaced && (
                                <span className="text-[10px] font-medium text-emerald-400 shrink-0">
                                  On Map
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                              <span style={{ color: roleMeta.textHex }} className="font-medium shrink-0">
                                {player.role}
                              </span>
                              {(player.path1 || player.weapon1 || player.path2 || player.weapon2) && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="flex items-center gap-1 truncate">
                                    {[
                                      { name: player.path1, icons: pathIcons, label: 'Path' },
                                      { name: player.weapon1, icons: weaponIcons, label: 'Weapon' },
                                      { name: player.path2, icons: pathIcons, label: 'Path' },
                                      { name: player.weapon2, icons: weaponIcons, label: 'Weapon' },
                                    ]
                                      .filter((slot) => Boolean(slot.name))
                                      .map((slot, idx) => {
                                        const icon = findAssetIcon(slot.name, slot.icons);
                                        if (icon) {
                                          return (
                                            <img
                                              key={`${slot.label}-${slot.name}-${idx}`}
                                              src={icon.imageDataUrl}
                                              alt={icon.name}
                                              title={`${slot.label}: ${icon.name}`}
                                              referrerPolicy="no-referrer"
                                              className="h-5 w-5 shrink-0 object-contain"
                                            />
                                          );
                                        }
                                        return (
                                          <span
                                            key={`${slot.label}-${slot.name}-${idx}`}
                                            title={`${slot.label}: ${slot.name}`}
                                            className="truncate text-[10px] text-slate-400"
                                          >
                                            {slot.name}
                                          </span>
                                        );
                                      })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <i
                          className="fa-solid fa-grip-vertical text-xs text-slate-600 shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'squads' && (
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Teams &amp; Squad Assignment
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Deploy places the team name on the map. Click the team name on the map to spread all members around it.
              </p>
            </div>

            {groupedSquads.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-400">
                Roster is empty. Add players in Manage Roster.
              </div>
            ) : (
              groupedSquads.map(([teamKey, members]) => {
                const displayName = teamNames[teamKey] || teamKey;
                const isEditing = editingTeamKey === teamKey;
                const onMapCount = members.filter((m) => placedPlayerIds.has(m.id)).length;
                const deployedSquad = placedSquads.find((s) => s.teamKey === teamKey);
                const roleCounts = {
                  Tank: members.filter((m) => m.role === 'Tank').length,
                  Healer: members.filter((m) => m.role === 'Healer').length,
                  DPS: members.filter((m) => m.role === 'DPS').length,
                  Support: members.filter((m) => m.role === 'Support').length,
                };

                return (
                  <div
                    key={teamKey}
                    className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {isEditing ? (
                        <form
                          className="flex flex-1 items-center gap-1.5"
                          onSubmit={(e) => {
                            e.preventDefault();
                            onRenameTeam(teamKey, teamDraftName.trim() || teamKey);
                            setEditingTeamKey(null);
                          }}
                        >
                          <input
                            type="text"
                            value={teamDraftName}
                            onChange={(e) => setTeamDraftName(e.target.value)}
                            autoFocus
                            className="w-full rounded border border-blue-500 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 cursor-pointer"
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="truncate font-display text-sm font-semibold text-slate-100">
                            {displayName}
                          </h3>
                          {teamKey !== 'Unassigned' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeamKey(teamKey);
                                setTeamDraftName(displayName);
                              }}
                              title="Rename squad display name"
                              className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-pen text-[10px]" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      )}

                      <span className="font-mono-tabular text-xs text-slate-400 shrink-0">
                        {members.length} {members.length === 1 ? 'unit' : 'units'}
                      </span>
                    </div>

                    {/* Clean unboxed composition summary */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono-tabular">
                      <span className="text-amber-300">T:{roleCounts.Tank}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-300">H:{roleCounts.Healer}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-rose-300">D:{roleCounts.DPS}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-300">S:{roleCounts.Support}</span>
                    </div>

                    {/* Members compact list */}
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {members.map((m) => {
                        const rMeta = ROLE_META[m.role];
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-xs py-0.5 border-b border-slate-900 last:border-0"
                          >
                            <span className="truncate text-slate-200">{m.name}</span>
                            <span
                              className="text-[11px] font-medium shrink-0 ml-2"
                              style={{ color: rMeta.textHex }}
                            >
                              {m.role}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Deploy & Recall Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onDeploySquad(teamKey, members)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <i className="fa-solid fa-bullseye" aria-hidden="true" />
                        <span>
                          {deployedSquad
                            ? deployedSquad.isExpanded
                              ? 'Re-center Squad'
                              : 'On Map (Click Name)'
                            : 'Deploy Squad'}
                        </span>
                      </button>

                      {(deployedSquad || onMapCount > 0) && (
                        <button
                          type="button"
                          onClick={() => onRecallSquad(teamKey, members)}
                          title="Remove team and squad tokens from map"
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:text-rose-300 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                          <span>Recall</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {activeTab === 'draw' && (
          <section className="space-y-5">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Drawing &amp; Tactical Annotations
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Select a tool and draw directly on the 1200x900 battlefield map.
              </p>
            </div>

            {/* Tool Mode Switcher */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-300">Active Tool</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { mode: 'select', label: 'Select / Move', icon: 'fa-arrow-pointer' },
                    { mode: 'arrow', label: 'Draw Arrow', icon: 'fa-arrow-right-long' },
                    { mode: 'pen', label: 'Freehand Pen', icon: 'fa-pen' },
                    { mode: 'note', label: 'Tactical Note', icon: 'fa-note-sticky' },
                  ] as const
                ).map((item) => {
                  const active = toolMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => onToolModeChange(item.mode)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                      }`}
                    >
                      <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Picker Palette */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Annotation Color</span>
                <span className="font-mono-tabular text-[11px] text-slate-400">
                  {TACTICAL_COLORS.find((c) => c.hex === activeColor)?.label || activeColor}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {TACTICAL_COLORS.map((swatch) => {
                  const selected = activeColor === swatch.hex;
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => onColorChange(swatch.hex)}
                      title={swatch.label}
                      aria-label={`Select ${swatch.label} color`}
                      className={`flex h-9 items-center justify-center rounded-lg border transition-transform cursor-pointer ${
                        selected
                          ? 'border-white scale-105 ring-2 ring-blue-500/60'
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {selected && (
                        <i
                          className={`fa-solid fa-check text-xs ${
                            swatch.id === 'white' || swatch.id === 'yellow'
                              ? 'text-slate-950'
                              : 'text-white'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tool Context Guidance */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-slate-100">
                {toolMode === 'select' && 'Select & Move Mode'}
                {toolMode === 'arrow' && 'Directional Arrow Mode'}
                {toolMode === 'pen' && 'Freehand Pen Mode'}
                {toolMode === 'note' && 'Tactical Note Mode'}
              </div>
              <p className="text-slate-400 leading-relaxed">
                {toolMode === 'select' &&
                  'Drag players, icons, and sticky notes freely across the battlefield. Hover any item to remove it.'}
                {toolMode === 'arrow' &&
                  'Click and drag on the battlefield to draw a directional attack or rotation arrow.'}
                {toolMode === 'pen' &&
                  'Click and drag anywhere on the map to sketch freehand flanks, zones, or choke points.'}
                {toolMode === 'note' &&
                  'Click anywhere on the map to drop an editable tactical sticky note at that location.'}
              </p>
            </div>

            {/* Undo & Clear Controls */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onUndoAnnotation}
                disabled={!hasAnnotations}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                <span>Undo Last Drawing / Note</span>
              </button>

              <button
                type="button"
                onClick={onClearAllAnnotations}
                disabled={!hasAnnotations}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-trash-can" aria-hidden="true" />
                <span>Clear All Drawings &amp; Notes</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
