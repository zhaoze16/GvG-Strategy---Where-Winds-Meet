import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { BattlefieldCanvas } from './components/BattlefieldCanvas';
import { LeftSidebar } from './components/LeftSidebar';
import { RosterModal, RosterModalTab } from './components/RosterModal';
import { TopNavHeader } from './components/TopNavHeader';
import { CANVAS_HEIGHT, CANVAS_WIDTH, MAP_ICONS_META } from './data/defaultRoster';
import {
  AppState,
  DrawingArrow,
  DrawingPath,
  MapIconType,
  MapType,
  PathIcon,
  PlacedIcon,
  PlacedPlayer,
  PlacedSquad,
  Player,
  PlayerRole,
  SidebarTab,
  TacticalNote,
  ToolMode,
  WeaponIcon,
} from './types/gvg';
import { loadBinaryAssets, saveBinaryAssets } from './utils/assetStorage';
import {
  buildExportJson,
  extractDominantColorFromDataUrl,
  loadAppState,
  parseImportedJson,
  processSingleIconWithColor,
  saveAppState,
} from './utils/storageAndSchema';

interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

function resolveCssColorFunctions(cssText: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cssText;

  return cssText.replace(/(?:oklch|oklab|lab|lch)\([^)]+\)/gi, (match) => {
    try {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = match;
      return ctx.fillStyle || '#1e293b';
    } catch {
      return '#1e293b';
    }
  });
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<SidebarTab>('objects');
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [activeColor, setActiveColor] = useState<string>('#3b82f6');
  const [isRosterOpen, setIsRosterOpen] = useState<boolean>(false);
  const [modalInitialTab, setModalInitialTab] = useState<RosterModalTab>('roster');
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [annotationHistory, setAnnotationHistory] = useState<
    Array<{ kind: 'arrow' | 'drawing' | 'note'; id: string }>
  >([]);
  const assetsLoadedRef = useRef(false);
  const initialStateRef = useRef(state);

  const captureRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    const id = Date.now();
    setToast({ id, text, tone });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3200);
  }, []);

  // Hydrate large binary assets & backfill missing dominant border colors on mount
  useEffect(() => {
    let active = true;
    loadBinaryAssets().then(async (assets) => {
      if (!active) return;
      assetsLoadedRef.current = true;

      const hydratedPaths = await Promise.all(
        (assets?.pathIcons ?? []).map(async (p) =>
          p.accentColor
            ? p
            : { ...p, accentColor: await extractDominantColorFromDataUrl(p.imageDataUrl) }
        )
      );

      const baseRoleIcons =
        Object.keys(initialStateRef.current.roleIcons).length > 0
          ? initialStateRef.current.roleIcons
          : assets?.roleIcons ?? {};
      const backfilledRoleColors: Partial<Record<PlayerRole, string>> = {
        ...(assets?.roleIconColors ?? {}),
        ...initialStateRef.current.roleIconColors,
      };
      for (const [role, dataUrl] of Object.entries(baseRoleIcons) as Array<
        [PlayerRole, string]
      >) {
        if (dataUrl && !backfilledRoleColors[role]) {
          backfilledRoleColors[role] = await extractDominantColorFromDataUrl(dataUrl);
        }
      }

      const baseMapIcons =
        Object.keys(initialStateRef.current.mapObjectIcons).length > 0
          ? initialStateRef.current.mapObjectIcons
          : assets?.mapObjectIcons ?? {};
      const backfilledMapColors: Partial<Record<MapIconType, string>> = {
        ...(assets?.mapObjectIconColors ?? {}),
        ...initialStateRef.current.mapObjectIconColors,
      };
      for (const [type, dataUrl] of Object.entries(baseMapIcons) as Array<
        [MapIconType, string]
      >) {
        if (dataUrl && !backfilledMapColors[type]) {
          backfilledMapColors[type] = await extractDominantColorFromDataUrl(dataUrl);
        }
      }

      if (!active) return;

      setState((prev) => ({
        ...prev,
        weaponIcons:
          prev.weaponIcons.length > 0 ? prev.weaponIcons : assets?.weaponIcons ?? [],
        pathIcons: prev.pathIcons.length > 0 ? prev.pathIcons : hydratedPaths,
        roleIcons:
          Object.keys(prev.roleIcons).length > 0 ? prev.roleIcons : baseRoleIcons,
        roleIconColors:
          Object.keys(prev.roleIconColors).length > 0
            ? prev.roleIconColors
            : backfilledRoleColors,
        mapObjectIcons:
          Object.keys(prev.mapObjectIcons).length > 0
            ? prev.mapObjectIcons
            : baseMapIcons,
        mapObjectIconColors:
          Object.keys(prev.mapObjectIconColors).length > 0
            ? prev.mapObjectIconColors
            : backfilledMapColors,
        customMapImage: prev.customMapImage ?? assets?.customMapImage ?? null,
      }));
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-save full state to localStorage + binary assets to IndexedDB
  useEffect(() => {
    saveAppState(state);
    if (assetsLoadedRef.current) {
      saveBinaryAssets({
        weaponIcons: state.weaponIcons,
        pathIcons: state.pathIcons,
        roleIcons: state.roleIcons,
        roleIconColors: state.roleIconColors,
        mapObjectIcons: state.mapObjectIcons,
        mapObjectIconColors: state.mapObjectIconColors,
        customMapImage: state.customMapImage,
      });
    }
  }, [state]);

  // Global Actions
  const handleResetMap = useCallback(() => {
    setState((prev) => ({
      ...prev,
      placedPlayers: [],
      placedSquads: [],
      placedIcons: [],
      arrows: [],
      drawings: [],
      notes: [],
    }));
    setAnnotationHistory([]);
    showToast('Battlefield cleared. Guild roster preserved.');
  }, [showToast]);

  const handleImportJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (typeof reader.result !== 'string') {
            throw new Error('Unable to read file.');
          }
          const imported = parseImportedJson(reader.result);
          setState(imported);
          setAnnotationHistory([]);
          showToast(`Imported ${imported.players.length} players and tactical layout.`);
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : 'Failed to parse Guild War JSON.',
            'error'
          );
        }
      };
      reader.readAsText(file);
    },
    [showToast]
  );

  const handleExportJson = useCallback(() => {
    const payload = buildExportJson(state);
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `gvg-strategy-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported Guild War strategy JSON.');
  }, [state, showToast]);

  const handleSnapshotPng = useCallback(async () => {
    const target = captureRef.current;
    if (!target || isExportingPng) return;

    setIsExportingPng(true);
    try {
      const canvas = await html2canvas(target, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        scale: 2,
        useCORS: true,
        backgroundColor: '#0b1322',
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          // Reset CSS scale transform on parent wrapper so PNG is full 1200x900
          if (clonedElement.parentElement) {
            clonedElement.parentElement.style.transform = 'none';
          }
          // Convert Tailwind v4 oklch/oklab colors in cloned stylesheets so html2canvas parses cleanly
          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
            if (styleEl.textContent && /(?:oklch|oklab|lab|lch)\(/i.test(styleEl.textContent)) {
              styleEl.textContent = resolveCssColorFunctions(styleEl.textContent);
            }
          });
        },
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = dataUrl;
      link.download = `gvg-battlefield-${dateStamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Battlefield PNG snapshot downloaded.');
    } catch {
      showToast('Could not capture PNG snapshot.', 'error');
    } finally {
      setIsExportingPng(false);
    }
  }, [isExportingPng, showToast]);

  // Map Background Switcher
  const handleMapTypeChange = useCallback((mapType: MapType) => {
    setState((prev) => ({ ...prev, mapType }));
  }, []);

  const handleCustomMapUpload = useCallback(
    (dataUrl: string) => {
      setState((prev) => ({
        ...prev,
        mapType: 'custom',
        customMapImage: dataUrl,
      }));
      showToast('Custom tactical map loaded.');
    },
    [showToast]
  );

  // Spawning & Moving Icons
  const spawnIconAt = useCallback((type: MapIconType, x: number, y: number) => {
    const newIcon: PlacedIcon = {
      id: `icon-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      x,
      y,
    };
    setState((prev) => ({
      ...prev,
      placedIcons: [...prev.placedIcons, newIcon],
    }));
  }, []);

  const handleSpawnIconCenter = useCallback(
    (type: MapIconType) => {
      const jitterX = Math.round((Math.random() - 0.5) * 70);
      const jitterY = Math.round((Math.random() - 0.5) * 70);
      spawnIconAt(type, CANVAS_WIDTH / 2 + jitterX, CANVAS_HEIGHT / 2 + jitterY);
    },
    [spawnIconAt]
  );

  const handleMoveIcon = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      placedIcons: prev.placedIcons.map((icon) =>
        icon.id === id ? { ...icon, x, y } : icon
      ),
    }));
  }, []);

  const handleRemoveIcon = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      placedIcons: prev.placedIcons.filter((icon) => icon.id !== id),
    }));
  }, []);

  // Spawning & Moving Players
  const spawnOrMovePlayerAt = useCallback((player: Player, x: number, y: number) => {
    setState((prev) => {
      const existing = prev.placedPlayers.find((p) => p.playerId === player.id);
      if (existing) {
        return {
          ...prev,
          placedPlayers: prev.placedPlayers.map((p) =>
            p.playerId === player.id ? { ...p, x, y } : p
          ),
        };
      }
      const placed: PlacedPlayer = {
        id: `token-${player.id}-${Date.now()}`,
        playerId: player.id,
        name: player.name,
        role: player.role,
        team: player.team,
        weapon1: player.weapon1,
        weapon2: player.weapon2,
        path1: player.path1,
        path2: player.path2,
        x,
        y,
      };
      return {
        ...prev,
        placedPlayers: [...prev.placedPlayers, placed],
      };
    });
  }, []);

  const handleSpawnPlayerCenter = useCallback(
    (player: Player) => {
      const jitterX = Math.round((Math.random() - 0.5) * 60);
      const jitterY = Math.round((Math.random() - 0.5) * 60);
      spawnOrMovePlayerAt(player, CANVAS_WIDTH / 2 + jitterX, CANVAS_HEIGHT / 2 + jitterY);
    },
    [spawnOrMovePlayerAt]
  );

  const handleMovePlacedPlayer = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      placedPlayers: prev.placedPlayers.map((p) => (p.id === id ? { ...p, x, y } : p)),
    }));
  }, []);

  const handleRemovePlacedPlayer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      placedPlayers: prev.placedPlayers.filter((p) => p.id !== id),
    }));
  }, []);

  // Team-Marker First, Click-to-Expand Circular Squad Deployment
  const handleDeploySquad = useCallback(
    (teamKey: string, members: Player[]) => {
      if (members.length === 0) return;
      const displayName = state.teamNames[teamKey] || teamKey;
      const existing = state.placedSquads.find((s) => s.teamKey === teamKey);

      if (!existing) {
        const offsetIdx = state.placedSquads.length % 5;
        const offsetY =
          offsetIdx === 0
            ? 0
            : (offsetIdx % 2 === 1 ? -1 : 1) * Math.ceil(offsetIdx / 2) * 48;
        const newSquad: PlacedSquad = {
          id: `squad-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          teamKey,
          x: CANVAS_WIDTH / 2,
          y: Math.max(60, Math.min(CANVAS_HEIGHT - 60, CANVAS_HEIGHT / 2 + offsetY)),
          isExpanded: false,
        };
        setState((prev) => ({
          ...prev,
          placedSquads: [...prev.placedSquads, newSquad],
        }));
        showToast(
          `Team "${displayName}" placed on map. Click its name on the map to expand all members.`
        );
        return;
      }

      if (existing.isExpanded) {
        const count = members.length;
        const radius = count <= 1 ? 44 : Math.min(100, Math.max(50, 40 + count * 5));
        setState((prev) => {
          const nextPlaced = [...prev.placedPlayers];
          members.forEach((member, idx) => {
            const angle = (2 * Math.PI * idx) / Math.max(1, count) - Math.PI / 2;
            const tx = Math.max(
              36,
              Math.min(CANVAS_WIDTH - 36, Math.round(existing.x + radius * Math.cos(angle)))
            );
            const ty = Math.max(
              36,
              Math.min(CANVAS_HEIGHT - 36, Math.round(existing.y + radius * Math.sin(angle)))
            );
            const existingIdx = nextPlaced.findIndex((p) => p.playerId === member.id);
            if (existingIdx >= 0) {
              nextPlaced[existingIdx] = { ...nextPlaced[existingIdx], x: tx, y: ty };
            } else {
              nextPlaced.push({
                id: `token-${member.id}-${Date.now()}-${idx}`,
                playerId: member.id,
                name: member.name,
                role: member.role,
                team: member.team,
                weapon1: member.weapon1,
                weapon2: member.weapon2,
                path1: member.path1,
                path2: member.path2,
                x: tx,
                y: ty,
              });
            }
          });
          return { ...prev, placedPlayers: nextPlaced };
        });
        showToast(`Re-centered "${displayName}" formation around team name.`);
      } else {
        showToast(`"${displayName}" is on the map — click its name on the map to deploy members.`);
      }
    },
    [showToast, state.placedSquads, state.teamNames]
  );

  const handleToggleSquadExpand = useCallback((squadId: string) => {
    setState((prev) => {
      const squad = prev.placedSquads.find((s) => s.id === squadId);
      if (!squad) return prev;

      const squadMembers = prev.players.filter(
        (p) => (p.team.trim() || 'Unassigned') === squad.teamKey
      );
      const squadMemberIds = new Set(squadMembers.map((m) => m.id));

      if (!squad.isExpanded) {
        const count = squadMembers.length;
        const radius = count <= 1 ? 44 : Math.min(100, Math.max(50, 40 + count * 5));
        const nextPlaced = [...prev.placedPlayers];

        squadMembers.forEach((member, idx) => {
          const angle = (2 * Math.PI * idx) / Math.max(1, count) - Math.PI / 2;
          const tx = Math.max(
            36,
            Math.min(CANVAS_WIDTH - 36, Math.round(squad.x + radius * Math.cos(angle)))
          );
          const ty = Math.max(
            36,
            Math.min(CANVAS_HEIGHT - 36, Math.round(squad.y + radius * Math.sin(angle)))
          );

          const existingIdx = nextPlaced.findIndex((p) => p.playerId === member.id);
          if (existingIdx >= 0) {
            nextPlaced[existingIdx] = { ...nextPlaced[existingIdx], x: tx, y: ty };
          } else {
            nextPlaced.push({
              id: `token-${member.id}-${Date.now()}-${idx}`,
              playerId: member.id,
              name: member.name,
              role: member.role,
              team: member.team,
              weapon1: member.weapon1,
              weapon2: member.weapon2,
              path1: member.path1,
              path2: member.path2,
              x: tx,
              y: ty,
            });
          }
        });

        return {
          ...prev,
          placedPlayers: nextPlaced,
          placedSquads: prev.placedSquads.map((s) =>
            s.id === squadId ? { ...s, isExpanded: true } : s
          ),
        };
      }

      return {
        ...prev,
        placedPlayers: prev.placedPlayers.filter((p) => !squadMemberIds.has(p.playerId)),
        placedSquads: prev.placedSquads.map((s) =>
          s.id === squadId ? { ...s, isExpanded: false } : s
        ),
      };
    });
  }, []);

  const handleMovePlacedSquad = useCallback((squadId: string, x: number, y: number) => {
    setState((prev) => {
      const target = prev.placedSquads.find((s) => s.id === squadId);
      if (!target) return prev;

      const dx = x - target.x;
      const dy = y - target.y;

      return {
        ...prev,
        placedSquads: prev.placedSquads.map((s) => (s.id === squadId ? { ...s, x, y } : s)),
        placedPlayers: target.isExpanded
          ? prev.placedPlayers.map((p) => {
              if ((p.team.trim() || 'Unassigned') !== target.teamKey) return p;
              return {
                ...p,
                x: Math.max(24, Math.min(CANVAS_WIDTH - 24, Math.round(p.x + dx))),
                y: Math.max(24, Math.min(CANVAS_HEIGHT - 24, Math.round(p.y + dy))),
              };
            })
          : prev.placedPlayers,
      };
    });
  }, []);

  const handleRemovePlacedSquad = useCallback((squadId: string) => {
    setState((prev) => {
      const target = prev.placedSquads.find((s) => s.id === squadId);
      if (!target) return prev;
      const memberIds = new Set(
        prev.players
          .filter((p) => (p.team.trim() || 'Unassigned') === target.teamKey)
          .map((p) => p.id)
      );
      return {
        ...prev,
        placedSquads: prev.placedSquads.filter((s) => s.id !== squadId),
        placedPlayers: prev.placedPlayers.filter((p) => !memberIds.has(p.playerId)),
      };
    });
  }, []);

  const handleRecallSquad = useCallback((teamKey: string, members: Player[]) => {
    const memberIds = new Set(members.map((m) => m.id));
    setState((prev) => ({
      ...prev,
      placedSquads: prev.placedSquads.filter((s) => s.teamKey !== teamKey),
      placedPlayers: prev.placedPlayers.filter((p) => !memberIds.has(p.playerId)),
    }));
  }, []);

  const handleRenameTeam = useCallback((teamKey: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      teamNames: {
        ...prev.teamNames,
        [teamKey]: newName,
      },
    }));
  }, []);

  const handleCreateTeam = useCallback(
    (rawName: string) => {
      const trimmed = rawName.trim();
      if (!trimmed || trimmed.toLowerCase() === 'unassigned') return;

      const exists =
        Object.keys(state.teamNames).some(
          (k) => k.trim().toLowerCase() === trimmed.toLowerCase()
        ) ||
        state.players.some((p) => p.team.trim().toLowerCase() === trimmed.toLowerCase());

      if (exists) {
        showToast(`Team "${trimmed}" already exists.`);
        return;
      }

      setState((prev) => ({
        ...prev,
        teamNames: {
          ...prev.teamNames,
          [trimmed]: trimmed,
        },
      }));
      showToast(`Team "${trimmed}" created.`);
    },
    [showToast, state.players, state.teamNames]
  );

  const handleDeleteTeam = useCallback(
    (teamKey: string) => {
      if (teamKey === 'Unassigned') return;
      const displayName = state.teamNames[teamKey] || teamKey;

      setState((prev) => {
        const nextTeamNames = { ...prev.teamNames };
        delete nextTeamNames[teamKey];

        const squad = prev.placedSquads.find((s) => s.teamKey === teamKey);
        const memberIds = new Set(
          prev.players
            .filter((p) => (p.team.trim() || 'Unassigned') === teamKey)
            .map((p) => p.id)
        );

        return {
          ...prev,
          teamNames: nextTeamNames,
          players: prev.players.map((p) =>
            memberIds.has(p.id) ? { ...p, team: '' } : p
          ),
          placedSquads: prev.placedSquads.filter((s) => s.teamKey !== teamKey),
          placedPlayers: squad?.isExpanded
            ? prev.placedPlayers.filter((p) => !memberIds.has(p.playerId))
            : prev.placedPlayers.map((p) =>
                memberIds.has(p.playerId) ? { ...p, team: '' } : p
              ),
        };
      });

      showToast(`Team "${displayName}" removed; members moved to Unassigned.`);
    },
    [showToast, state.teamNames]
  );

  const handleAssignPlayerToTeam = useCallback((playerId: string, teamKey: string) => {
    setState((prev) => {
      const nextPlayers = prev.players.map((p) =>
        p.id === playerId ? { ...p, team: teamKey } : p
      );
      let nextPlaced = prev.placedPlayers.map((p) =>
        p.playerId === playerId ? { ...p, team: teamKey } : p
      );

      const expandedSquad = prev.placedSquads.find(
        (s) => s.teamKey === teamKey && s.isExpanded
      );
      if (expandedSquad) {
        const squadMembers = nextPlayers.filter(
          (p) => (p.team.trim() || 'Unassigned') === teamKey
        );
        const count = squadMembers.length;
        const radius = count <= 1 ? 44 : Math.min(100, Math.max(50, 40 + count * 5));

        squadMembers.forEach((member, idx) => {
          const angle = (2 * Math.PI * idx) / Math.max(1, count) - Math.PI / 2;
          const tx = Math.max(
            36,
            Math.min(CANVAS_WIDTH - 36, Math.round(expandedSquad.x + radius * Math.cos(angle)))
          );
          const ty = Math.max(
            36,
            Math.min(CANVAS_HEIGHT - 36, Math.round(expandedSquad.y + radius * Math.sin(angle)))
          );
          const existingIdx = nextPlaced.findIndex((p) => p.playerId === member.id);
          if (existingIdx >= 0) {
            nextPlaced[existingIdx] = { ...nextPlaced[existingIdx], team: teamKey, x: tx, y: ty };
          } else {
            nextPlaced.push({
              id: `token-${member.id}-${Date.now()}-${idx}`,
              playerId: member.id,
              name: member.name,
              role: member.role,
              team: member.team,
              weapon1: member.weapon1,
              weapon2: member.weapon2,
              path1: member.path1,
              path2: member.path2,
              x: tx,
              y: ty,
            });
          }
        });
      }

      return {
        ...prev,
        players: nextPlayers,
        placedPlayers: nextPlaced,
      };
    });
  }, []);

  const handleRemovePlayerFromTeam = useCallback((playerId: string) => {
    setState((prev) => {
      const target = prev.players.find((p) => p.id === playerId);
      const oldTeamKey = target ? target.team.trim() || 'Unassigned' : '';
      const wasInExpandedSquad = prev.placedSquads.some(
        (s) => s.teamKey === oldTeamKey && s.isExpanded
      );

      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, team: '' } : p
        ),
        placedPlayers: wasInExpandedSquad
          ? prev.placedPlayers.filter((p) => p.playerId !== playerId)
          : prev.placedPlayers.map((p) =>
              p.playerId === playerId ? { ...p, team: '' } : p
            ),
      };
    });
  }, []);

  // Drawing & Tactical Notes
  const handleAddArrow = useCallback((arrow: Omit<DrawingArrow, 'id'>) => {
    const id = `arrow-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setState((prev) => ({
      ...prev,
      arrows: [...prev.arrows, { ...arrow, id }],
    }));
    setAnnotationHistory((h) => [...h, { kind: 'arrow', id }]);
  }, []);

  const handleRemoveArrow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      arrows: prev.arrows.filter((a) => a.id !== id),
    }));
  }, []);

  const handleAddDrawing = useCallback((drawing: Omit<DrawingPath, 'id'>) => {
    const id = `draw-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setState((prev) => ({
      ...prev,
      drawings: [...prev.drawings, { ...drawing, id }],
    }));
    setAnnotationHistory((h) => [...h, { kind: 'drawing', id }]);
  }, []);

  const handleRemoveDrawing = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      drawings: prev.drawings.filter((d) => d.id !== id),
    }));
  }, []);

  const handleAddNote = useCallback((note: Omit<TacticalNote, 'id'>) => {
    const id = `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setState((prev) => ({
      ...prev,
      notes: [...prev.notes, { ...note, id }],
    }));
    setAnnotationHistory((h) => [...h, { kind: 'note', id }]);
    return id;
  }, []);

  const handleUpdateNoteText = useCallback((id: string, text: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, text } : n)),
    }));
  }, []);

  const handleMoveNote = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }));
  }, []);

  const handleRemoveNote = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
  }, []);

  const handleUndoAnnotation = useCallback(() => {
    const last = annotationHistory[annotationHistory.length - 1];
    if (!last) {
      // Fallback: pop most recent note, drawing, or arrow if history is empty (e.g. after reload)
      setState((prev) => {
        if (prev.notes.length > 0) {
          return { ...prev, notes: prev.notes.slice(0, -1) };
        }
        if (prev.drawings.length > 0) {
          return { ...prev, drawings: prev.drawings.slice(0, -1) };
        }
        if (prev.arrows.length > 0) {
          return { ...prev, arrows: prev.arrows.slice(0, -1) };
        }
        return prev;
      });
      return;
    }

    setAnnotationHistory((h) => h.slice(0, -1));
    setState((prev) => {
      if (last.kind === 'arrow') {
        return { ...prev, arrows: prev.arrows.filter((a) => a.id !== last.id) };
      }
      if (last.kind === 'drawing') {
        return { ...prev, drawings: prev.drawings.filter((d) => d.id !== last.id) };
      }
      return { ...prev, notes: prev.notes.filter((n) => n.id !== last.id) };
    });
  }, [annotationHistory]);

  const handleClearAllAnnotations = useCallback(() => {
    setState((prev) => ({
      ...prev,
      arrows: [],
      drawings: [],
      notes: [],
    }));
    setAnnotationHistory([]);
    showToast('All drawings and tactical notes cleared.');
  }, [showToast]);

  // Roster CRUD
  const handleAddPlayer = useCallback((player: Player) => {
    setState((prev) => ({
      ...prev,
      players: [...prev.players, player],
    }));
  }, []);

  const handleUpdatePlayer = useCallback((originalId: string, updated: Player) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === originalId ? updated : p)),
      placedPlayers: prev.placedPlayers.map((token) =>
        token.playerId === originalId
          ? {
              ...token,
              playerId: updated.id,
              name: updated.name,
              role: updated.role,
              team: updated.team,
              weapon1: updated.weapon1,
              weapon2: updated.weapon2,
              path1: updated.path1,
              path2: updated.path2,
            }
          : token
      ),
    }));
  }, []);

  const handleDeletePlayer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
      placedPlayers: prev.placedPlayers.filter((token) => token.playerId !== id),
    }));
  }, []);

  const handleClearAllPlayers = useCallback(() => {
    setState((prev) => ({
      ...prev,
      players: [],
      placedPlayers: [],
      placedSquads: [],
    }));
  }, []);

  // Weapon Icons CRUD
  const handleAddWeaponIcons = useCallback((newIcons: WeaponIcon[]) => {
    setState((prev) => {
      const merged = [...prev.weaponIcons];
      newIcons.forEach((incoming) => {
        const idx = merged.findIndex(
          (existing) => existing.name.trim().toLowerCase() === incoming.name.trim().toLowerCase()
        );
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            imageDataUrl: incoming.imageDataUrl,
            linkedPath: incoming.linkedPath ?? merged[idx].linkedPath,
          };
        } else {
          merged.push(incoming);
        }
      });
      return { ...prev, weaponIcons: merged };
    });
  }, []);

  const handleRenameWeaponIcon = useCallback((id: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      weaponIcons: prev.weaponIcons.map((w) => (w.id === id ? { ...w, name: newName } : w)),
    }));
  }, []);

  const handleDeleteWeaponIcon = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      weaponIcons: prev.weaponIcons.filter((w) => w.id !== id),
    }));
  }, []);

  const handleClearAllWeaponIcons = useCallback(() => {
    setState((prev) => ({
      ...prev,
      weaponIcons: [],
    }));
  }, []);

  // Path Icons CRUD
  const handleAddPathIcons = useCallback((newIcons: PathIcon[]) => {
    setState((prev) => {
      const merged = [...prev.pathIcons];
      newIcons.forEach((incoming) => {
        const idx = merged.findIndex(
          (existing) => existing.name.trim().toLowerCase() === incoming.name.trim().toLowerCase()
        );
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            imageDataUrl: incoming.imageDataUrl,
            linkedWeapons: incoming.linkedWeapons ?? merged[idx].linkedWeapons,
            accentColor: incoming.accentColor ?? merged[idx].accentColor,
          };
        } else {
          merged.push(incoming);
        }
      });
      return { ...prev, pathIcons: merged };
    });
  }, []);

  const handleRenamePathIcon = useCallback((id: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      pathIcons: prev.pathIcons.map((p) => (p.id === id ? { ...p, name: newName } : p)),
    }));
  }, []);

  const handleUpdatePathColor = useCallback((id: string, accentColor: string) => {
    setState((prev) => ({
      ...prev,
      pathIcons: prev.pathIcons.map((p) => (p.id === id ? { ...p, accentColor } : p)),
    }));
  }, []);

  const handleDeletePathIcon = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      pathIcons: prev.pathIcons.filter((p) => p.id !== id),
    }));
  }, []);

  const handleClearAllPathIcons = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pathIcons: [],
    }));
  }, []);

  // Role & Map Object Custom Icons CRUD
  const handleUpdateRoleIcon = useCallback(
    (role: PlayerRole, dataUrl: string | null, accentColor?: string) => {
      setState((prev) => {
        const nextIcons = { ...prev.roleIcons };
        const nextColors = { ...prev.roleIconColors };
        if (dataUrl) {
          nextIcons[role] = dataUrl;
          if (accentColor) nextColors[role] = accentColor;
        } else {
          delete nextIcons[role];
          delete nextColors[role];
        }
        return { ...prev, roleIcons: nextIcons, roleIconColors: nextColors };
      });
    },
    []
  );

  const handleUpdateRoleIconColor = useCallback((role: PlayerRole, color: string) => {
    setState((prev) => ({
      ...prev,
      roleIconColors: { ...prev.roleIconColors, [role]: color },
    }));
  }, []);

  const handleUpdateMapObjectIcon = useCallback(
    (type: MapIconType, dataUrl: string | null, accentColor?: string) => {
      setState((prev) => {
        const nextIcons = { ...prev.mapObjectIcons };
        const nextColors = { ...prev.mapObjectIconColors };
        if (dataUrl) {
          nextIcons[type] = dataUrl;
          if (accentColor) nextColors[type] = accentColor;
        } else {
          delete nextIcons[type];
          delete nextColors[type];
        }
        return { ...prev, mapObjectIcons: nextIcons, mapObjectIconColors: nextColors };
      });
    },
    []
  );

  const handleUpdateMapObjectIconColor = useCallback((type: MapIconType, color: string) => {
    setState((prev) => ({
      ...prev,
      mapObjectIconColors: { ...prev.mapObjectIconColors, [type]: color },
    }));
  }, []);

  const handleBatchUpdateSystemIcons = useCallback(
    (
      roles: Partial<Record<PlayerRole, string>>,
      roleColors: Partial<Record<PlayerRole, string>>,
      mapObjects: Partial<Record<MapIconType, string>>,
      mapObjectColors: Partial<Record<MapIconType, string>>
    ) => {
      setState((prev) => ({
        ...prev,
        roleIcons: { ...prev.roleIcons, ...roles },
        roleIconColors: { ...prev.roleIconColors, ...roleColors },
        mapObjectIcons: { ...prev.mapObjectIcons, ...mapObjects },
        mapObjectIconColors: { ...prev.mapObjectIconColors, ...mapObjectColors },
      }));
    },
    []
  );

  const handleResetAllSystemIcons = useCallback(() => {
    setState((prev) => ({
      ...prev,
      roleIcons: {},
      roleIconColors: {},
      mapObjectIcons: {},
      mapObjectIconColors: {},
    }));
  }, []);

  const handleQuickUploadMapObjectIcon = useCallback(
    async (type: MapIconType, file: File) => {
      try {
        const { imageDataUrl, accentColor } = await processSingleIconWithColor(file);
        handleUpdateMapObjectIcon(type, imageDataUrl, accentColor);
        showToast(`Icon ${MAP_ICONS_META[type].label} updated.`);
      } catch {
        showToast('Failed to read selected icon image.', 'error');
      }
    },
    [handleUpdateMapObjectIcon, showToast]
  );

  const hasAnnotations = useMemo(
    () => state.arrows.length > 0 || state.drawings.length > 0 || state.notes.length > 0,
    [state.arrows.length, state.drawings.length, state.notes.length]
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <TopNavHeader
        rosterCount={state.players.length}
        isExportingPng={isExportingPng}
        onResetMap={handleResetMap}
        onImportJson={handleImportJson}
        onExportJson={handleExportJson}
        onSnapshotPng={handleSnapshotPng}
        onOpenRosterModal={() => {
          setModalInitialTab('roster');
          setIsRosterOpen(true);
        }}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <LeftSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          players={state.players}
          placedPlayers={state.placedPlayers}
          placedSquads={state.placedSquads}
          weaponIcons={state.weaponIcons}
          pathIcons={state.pathIcons}
          roleIcons={state.roleIcons}
          roleIconColors={state.roleIconColors}
          mapObjectIcons={state.mapObjectIcons}
          mapObjectIconColors={state.mapObjectIconColors}
          teamNames={state.teamNames}
          toolMode={toolMode}
          activeColor={activeColor}
          hasAnnotations={hasAnnotations}
          onSpawnIconCenter={handleSpawnIconCenter}
          onSpawnPlayerCenter={handleSpawnPlayerCenter}
          onDeploySquad={handleDeploySquad}
          onRecallSquad={handleRecallSquad}
          onRenameTeam={handleRenameTeam}
          onCreateTeam={handleCreateTeam}
          onDeleteTeam={handleDeleteTeam}
          onAssignPlayerToTeam={handleAssignPlayerToTeam}
          onRemovePlayerFromTeam={handleRemovePlayerFromTeam}
          onToolModeChange={setToolMode}
          onColorChange={setActiveColor}
          onUndoAnnotation={handleUndoAnnotation}
          onClearAllAnnotations={handleClearAllAnnotations}
          onOpenIconsManager={() => {
            setModalInitialTab('icons');
            setIsRosterOpen(true);
          }}
          onQuickUploadMapObjectIcon={handleQuickUploadMapObjectIcon}
        />

        <BattlefieldCanvas
          captureRef={captureRef}
          mapType={state.mapType}
          customMapImage={state.customMapImage}
          toolMode={toolMode}
          activeColor={activeColor}
          players={state.players}
          placedPlayers={state.placedPlayers}
          placedSquads={state.placedSquads}
          teamNames={state.teamNames}
          placedIcons={state.placedIcons}
          weaponIcons={state.weaponIcons}
          pathIcons={state.pathIcons}
          roleIcons={state.roleIcons}
          roleIconColors={state.roleIconColors}
          mapObjectIcons={state.mapObjectIcons}
          mapObjectIconColors={state.mapObjectIconColors}
          arrows={state.arrows}
          drawings={state.drawings}
          notes={state.notes}
          onMapTypeChange={handleMapTypeChange}
          onCustomMapUpload={handleCustomMapUpload}
          onToolModeChange={setToolMode}
          onDropIcon={spawnIconAt}
          onDropPlayer={spawnOrMovePlayerAt}
          onMovePlayer={handleMovePlacedPlayer}
          onRemovePlayer={handleRemovePlacedPlayer}
          onToggleSquadExpand={handleToggleSquadExpand}
          onMoveSquad={handleMovePlacedSquad}
          onRemoveSquad={handleRemovePlacedSquad}
          onMoveIcon={handleMoveIcon}
          onRemoveIcon={handleRemoveIcon}
          onAddArrow={handleAddArrow}
          onRemoveArrow={handleRemoveArrow}
          onAddDrawing={handleAddDrawing}
          onRemoveDrawing={handleRemoveDrawing}
          onAddNote={handleAddNote}
          onUpdateNoteText={handleUpdateNoteText}
          onMoveNote={handleMoveNote}
          onRemoveNote={handleRemoveNote}
        />
      </div>

      <RosterModal
        isOpen={isRosterOpen}
        initialTab={modalInitialTab}
        players={state.players}
        weaponIcons={state.weaponIcons}
        pathIcons={state.pathIcons}
        roleIcons={state.roleIcons}
        roleIconColors={state.roleIconColors}
        mapObjectIcons={state.mapObjectIcons}
        mapObjectIconColors={state.mapObjectIconColors}
        onClose={() => setIsRosterOpen(false)}
        onAddPlayer={handleAddPlayer}
        onUpdatePlayer={handleUpdatePlayer}
        onDeletePlayer={handleDeletePlayer}
        onClearAllPlayers={handleClearAllPlayers}
        onAddWeaponIcons={handleAddWeaponIcons}
        onRenameWeaponIcon={handleRenameWeaponIcon}
        onDeleteWeaponIcon={handleDeleteWeaponIcon}
        onClearAllWeaponIcons={handleClearAllWeaponIcons}
        onAddPathIcons={handleAddPathIcons}
        onRenamePathIcon={handleRenamePathIcon}
        onUpdatePathColor={handleUpdatePathColor}
        onDeletePathIcon={handleDeletePathIcon}
        onClearAllPathIcons={handleClearAllPathIcons}
        onUpdateRoleIcon={handleUpdateRoleIcon}
        onUpdateRoleIconColor={handleUpdateRoleIconColor}
        onUpdateMapObjectIcon={handleUpdateMapObjectIcon}
        onUpdateMapObjectIconColor={handleUpdateMapObjectIconColor}
        onBatchUpdateSystemIcons={handleBatchUpdateSystemIcons}
        onResetAllSystemIcons={handleResetAllSystemIcons}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-xl ${
            toast.tone === 'error'
              ? 'border-rose-500/60 bg-rose-950/95 text-rose-200'
              : 'border-slate-700 bg-slate-900/95 text-slate-100'
          }`}
        >
          <i
            className={`fa-solid ${
              toast.tone === 'error'
                ? 'fa-circle-exclamation text-rose-400'
                : 'fa-circle-check text-amber-400'
            }`}
            aria-hidden="true"
          />
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
