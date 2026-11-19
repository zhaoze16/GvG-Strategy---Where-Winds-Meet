import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_ICONS_META,
  ROLE_META,
} from '../data/defaultRoster';
import {
  DrawingArrow,
  DrawingPath,
  MapIconType,
  MapType,
  PathIcon,
  PlacedIcon,
  PlacedPlayer,
  Player,
  PlayerRole,
  TacticalNote,
  ToolMode,
  WeaponIcon,
} from '../types/gvg';
import { findAssetIcon } from '../utils/storageAndSchema';
import { FortressCitySvg } from './FortressCitySvg';
import { TacticalGridSvg } from './TacticalGridSvg';

interface BattlefieldCanvasProps {
  captureRef: React.RefObject<HTMLDivElement | null>;
  mapType: MapType;
  customMapImage: string | null;
  toolMode: ToolMode;
  activeColor: string;
  placedPlayers: PlacedPlayer[];
  placedIcons: PlacedIcon[];
  weaponIcons: WeaponIcon[];
  pathIcons: PathIcon[];
  roleIcons: Partial<Record<PlayerRole, string>>;
  roleIconColors: Partial<Record<PlayerRole, string>>;
  mapObjectIcons: Partial<Record<MapIconType, string>>;
  mapObjectIconColors: Partial<Record<MapIconType, string>>;
  arrows: DrawingArrow[];
  drawings: DrawingPath[];
  notes: TacticalNote[];
  onMapTypeChange: (type: MapType) => void;
  onCustomMapUpload: (dataUrl: string) => void;
  onToolModeChange: (mode: ToolMode) => void;
  onDropIcon: (type: MapIconType, x: number, y: number) => void;
  onDropPlayer: (player: Player, x: number, y: number) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onRemovePlayer: (id: string) => void;
  onMoveIcon: (id: string, x: number, y: number) => void;
  onRemoveIcon: (id: string) => void;
  onAddArrow: (arrow: Omit<DrawingArrow, 'id'>) => void;
  onRemoveArrow: (id: string) => void;
  onAddDrawing: (drawing: Omit<DrawingPath, 'id'>) => void;
  onRemoveDrawing: (id: string) => void;
  onAddNote: (note: Omit<TacticalNote, 'id'>) => string;
  onUpdateNoteText: (id: string, text: string) => void;
  onMoveNote: (id: string, x: number, y: number) => void;
  onRemoveNote: (id: string) => void;
}

type DragTarget =
  | { kind: 'player'; id: string; offsetX: number; offsetY: number }
  | { kind: 'icon'; id: string; offsetX: number; offsetY: number }
  | { kind: 'note'; id: string; offsetX: number; offsetY: number };

function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const BattlefieldCanvas: React.FC<BattlefieldCanvasProps> = ({
  captureRef,
  mapType,
  customMapImage,
  toolMode,
  activeColor,
  placedPlayers,
  placedIcons,
  weaponIcons,
  pathIcons,
  roleIcons,
  roleIconColors,
  mapObjectIcons,
  mapObjectIconColors,
  arrows,
  drawings,
  notes,
  onMapTypeChange,
  onCustomMapUpload,
  onToolModeChange,
  onDropIcon,
  onDropPlayer,
  onMovePlayer,
  onRemovePlayer,
  onMoveIcon,
  onRemoveIcon,
  onAddArrow,
  onRemoveArrow,
  onAddDrawing,
  onRemoveDrawing,
  onAddNote,
  onUpdateNoteText,
  onMoveNote,
  onRemoveNote,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const customFileRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 600, y: 450 });
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [draftArrow, setDraftArrow] = useState<Omit<DrawingArrow, 'id'> | null>(null);
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[] | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [hoveredBadge, setHoveredBadge] = useState<{
    tokenId: string;
    label: string;
    color?: string;
  } | null>(null);
  const [expandedTokenIds, setExpandedTokenIds] = useState<Set<string>>(() => new Set());

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const panStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const dragRef = useRef<DragTarget | null>(null);
  const nameDownPosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const drawingModeRef = useRef<'arrow' | 'pen' | null>(null);
  const draftArrowRef = useRef<Omit<DrawingArrow, 'id'> | null>(null);
  const draftPointsRef = useRef<{ x: number; y: number }[] | null>(null);

  const clientToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const el = captureRef.current;
    if (!el) return { x: 600, y: 450 };
    const rect = el.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;
    const rawX = (clientX - rect.left) / (scaleX || 1);
    const rawY = (clientY - rect.top) / (scaleY || 1);
    return {
      x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH, rawX))),
      y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT, rawY))),
    };
  }, [captureRef]);

  const centerView = useCallback((targetZoom?: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const z = targetZoom ?? zoomRef.current;
    setPan({
      x: Math.round((vp.clientWidth - CANVAS_WIDTH * z) / 2),
      y: Math.round((vp.clientHeight - CANVAS_HEIGHT * z) / 2),
    });
  }, []);

  const zoomAroundCenter = useCallback((nextZoom: number) => {
    const vp = viewportRef.current;
    const clamped = Number(Math.max(0.45, Math.min(2.2, nextZoom)).toFixed(2));
    if (!vp) {
      setZoom(clamped);
      return;
    }
    const prevZoom = zoomRef.current;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const worldX = (cx - panRef.current.x) / prevZoom;
    const worldY = (cy - panRef.current.y) / prevZoom;
    setZoom(clamped);
    setPan({
      x: Math.round(cx - worldX * clamped),
      y: Math.round(cy - worldY * clamped),
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      centerView(1);
    }, 50);
    return () => clearTimeout(timer);
  }, [centerView]);

  // Smooth mouse-wheel zoom anchored toward the cursor position
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const prevZoom = zoomRef.current;
      const step = e.deltaY < 0 ? 0.1 : -0.1;
      const nextZoom = Number(Math.max(0.45, Math.min(2.2, prevZoom + step)).toFixed(2));
      if (nextZoom === prevZoom) return;

      const rect = vp.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - panRef.current.x) / prevZoom;
      const worldY = (mouseY - panRef.current.y) / prevZoom;

      setZoom(nextZoom);
      setPan({
        x: Math.round(mouseX - worldX * nextZoom),
        y: Math.round(mouseY - worldY * nextZoom),
      });
    };

    vp.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      vp.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Global mouse move / up listeners for panning, token dragging, and drawing
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (panStartRef.current) {
        const start = panStartRef.current;
        setPan({
          x: Math.round(start.panX + (e.clientX - start.mouseX)),
          y: Math.round(start.panY + (e.clientY - start.mouseY)),
        });
        return;
      }

      const pt = clientToCanvasCoords(e.clientX, e.clientY);
      setCoords(pt);

      if (dragRef.current) {
        const clampedX = Math.max(24, Math.min(CANVAS_WIDTH - 24, pt.x - dragRef.current.offsetX));
        const clampedY = Math.max(24, Math.min(CANVAS_HEIGHT - 24, pt.y - dragRef.current.offsetY));

        if (dragRef.current.kind === 'player') {
          onMovePlayer(dragRef.current.id, clampedX, clampedY);
        } else if (dragRef.current.kind === 'icon') {
          onMoveIcon(dragRef.current.id, clampedX, clampedY);
        } else if (dragRef.current.kind === 'note') {
          onMoveNote(dragRef.current.id, clampedX, clampedY);
        }
        return;
      }

      if (drawingModeRef.current === 'arrow' && draftArrowRef.current) {
        const updated = { ...draftArrowRef.current, x2: pt.x, y2: pt.y };
        draftArrowRef.current = updated;
        setDraftArrow(updated);
      } else if (drawingModeRef.current === 'pen' && draftPointsRef.current) {
        const pts = draftPointsRef.current;
        const last = pts[pts.length - 1];
        const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
        if (dist >= 3) {
          const nextPts = [...pts, pt];
          draftPointsRef.current = nextPts;
          setDraftPoints(nextPts);
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (panStartRef.current) {
        panStartRef.current = null;
        setIsPanning(false);
      }

      if (dragRef.current) {
        dragRef.current = null;
      }

      if (drawingModeRef.current === 'arrow' && draftArrowRef.current) {
        const a = draftArrowRef.current;
        const len = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
        if (len >= 12) {
          onAddArrow(a);
        }
        draftArrowRef.current = null;
        drawingModeRef.current = null;
        setDraftArrow(null);
      } else if (drawingModeRef.current === 'pen' && draftPointsRef.current) {
        if (draftPointsRef.current.length >= 2) {
          onAddDrawing({
            points: draftPointsRef.current,
            color: activeColor,
            width: 3,
          });
        }
        draftPointsRef.current = null;
        drawingModeRef.current = null;
        setDraftPoints(null);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [
    activeColor,
    clientToCanvasCoords,
    onAddArrow,
    onAddDrawing,
    onMoveIcon,
    onMoveNote,
    onMovePlayer,
  ]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const pt = clientToCanvasCoords(e.clientX, e.clientY);

    if (toolMode === 'arrow') {
      const initArrow = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, color: activeColor };
      drawingModeRef.current = 'arrow';
      draftArrowRef.current = initArrow;
      setDraftArrow(initArrow);
    } else if (toolMode === 'pen') {
      const initPts = [pt];
      drawingModeRef.current = 'pen';
      draftPointsRef.current = initPts;
      setDraftPoints(initPts);
    } else if (toolMode === 'note') {
      const newId = onAddNote({
        x: Math.max(80, Math.min(CANVAS_WIDTH - 120, pt.x)),
        y: Math.max(40, Math.min(CANVAS_HEIGHT - 80, pt.y)),
        text: '',
        color: activeColor,
      });
      setEditingNoteId(newId);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    setCoords(pt);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    const clampedX = Math.max(24, Math.min(CANVAS_WIDTH - 24, pt.x));
    const clampedY = Math.max(24, Math.min(CANVAS_HEIGHT - 24, pt.y));

    const iconType = e.dataTransfer.getData('application/gvg-icon') as MapIconType;
    if (iconType && MAP_ICONS_META[iconType]) {
      onDropIcon(iconType, clampedX, clampedY);
      return;
    }

    const playerRaw = e.dataTransfer.getData('application/gvg-player');
    if (playerRaw) {
      try {
        const player = JSON.parse(playerRaw) as Player;
        if (player && player.id) {
          onDropPlayer(player, clampedX, clampedY);
        }
      } catch {
        // Ignore malformed drop payload
      }
    }
  };

  const handleCustomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onCustomMapUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isPanButton =
      e.button === 1 || e.button === 2 || (e.button === 0 && toolMode === 'select');
    if (!isPanButton) return;
    if (e.button === 1) e.preventDefault();
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
    setIsPanning(true);
  };

  const handleFitZoom = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    const wRatio = (vp.clientWidth - 48) / CANVAS_WIDTH;
    const hRatio = (vp.clientHeight - 48) / CANVAS_HEIGHT;
    const fit = Number(Math.max(0.45, Math.min(1.2, Math.min(wRatio, hRatio))).toFixed(2));
    setZoom(fit);
    centerView(fit);
  };

  const cursorClass = isPanning
    ? 'cursor-grabbing'
    : toolMode === 'arrow' || toolMode === 'pen'
    ? 'cursor-crosshair'
    : toolMode === 'note'
    ? 'cursor-cell'
    : 'cursor-grab';

  const uniqueColors = Array.from(
    new Set([
      activeColor,
      ...arrows.map((a) => a.color),
    ])
  );

  return (
    <main className="flex flex-1 flex-col min-w-0 bg-slate-950">
      {/* Map Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/75 px-4 py-2">
        {/* Map Background Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Map Layer:</span>
          <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => onMapTypeChange('fortress')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mapType === 'fortress'
                  ? 'bg-slate-800 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fortress City
            </button>
            <button
              type="button"
              onClick={() => onMapTypeChange('grid')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mapType === 'grid'
                  ? 'bg-slate-800 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tactical Grid
            </button>
            <button
              type="button"
              onClick={() => {
                if (!customMapImage) {
                  customFileRef.current?.click();
                } else {
                  onMapTypeChange('custom');
                }
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mapType === 'custom'
                  ? 'bg-slate-800 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom Map
            </button>
          </div>

          <input
            ref={customFileRef}
            type="file"
            accept="image/*"
            onChange={handleCustomFileChange}
            className="hidden"
            aria-label="Upload custom tactical map image"
          />

          <button
            type="button"
            onClick={() => customFileRef.current?.click()}
            title="Upload local image file as map background"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-blue-500/50 hover:text-blue-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="fa-solid fa-upload text-[11px]" aria-hidden="true" />
            <span>Upload Map</span>
          </button>
        </div>

        {/* Coordinate Tracker, Mode & Viewport Controls */}
        <div className="flex items-center gap-3">
          {toolMode !== 'select' && (
            <button
              type="button"
              onClick={() => onToolModeChange('select')}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="fa-solid fa-arrow-pointer text-[11px]" aria-hidden="true" />
              <span>Return to Select</span>
            </button>
          )}

          <div className="font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
            X: <span className="text-amber-400 font-semibold">{String(coords.x).padStart(4, '0')}</span>
            <span className="mx-1.5 text-slate-600">/</span>
            Y: <span className="text-amber-400 font-semibold">{String(coords.y).padStart(4, '0')}</span>
          </div>

          <div className="inline-flex items-center rounded-md border border-slate-800 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => zoomAroundCenter(zoom - 0.15)}
              title="Zoom out (or scroll mouse wheel down)"
              aria-label="Zoom out"
              className="rounded px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-minus text-[10px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => zoomAroundCenter(1)}
              title="Reset zoom to 100%"
              className={`rounded px-2 py-0.5 font-mono-tabular text-xs transition-colors cursor-pointer ${
                zoom === 1 ? 'bg-slate-800 text-blue-300' : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => zoomAroundCenter(zoom + 0.15)}
              title="Zoom in (or scroll mouse wheel up)"
              aria-label="Zoom in"
              className="rounded px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleFitZoom}
              className="rounded border-l border-slate-800 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Fit
            </button>
          </div>

          <button
            type="button"
            onClick={() => centerView()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-blue-500/50 hover:text-blue-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="fa-solid fa-crosshairs text-blue-400 text-[11px]" aria-hidden="true" />
            <span>Center View</span>
          </button>
        </div>
      </div>

      {/* Pannable & Zoomable Battlefield Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleViewportMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative flex-1 overflow-hidden bg-[#060b14] ${
          isPanning ? 'cursor-grabbing' : toolMode === 'select' ? 'cursor-grab' : ''
        }`}
      >
        {/* Panned & Scaled Wrapper for 1200x900 Canvas */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Actual 1200x900 Capture Target (uses pure hex/rgb inline styles for html2canvas compatibility) */}
          <div
            ref={captureRef}
            id="battlefield-canvas"
            onMouseDown={handleCanvasMouseDown}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative overflow-hidden select-none ${cursorClass}`}
            style={{
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              backgroundColor: '#0b1322',
              border: '1px solid #334155',
              borderRadius: '6px',
            }}
          >
              {/* Layer 1: Map Background */}
              <div className="pointer-events-none absolute inset-0">
                {mapType === 'fortress' && <FortressCitySvg />}
                {mapType === 'grid' && <TacticalGridSvg />}
                {mapType === 'custom' && (
                  customMapImage ? (
                    <img
                      src={customMapImage}
                      alt="Custom Tactical Map"
                      referrerPolicy="no-referrer"
                      style={{
                        width: '1200px',
                        height: '900px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      className="flex h-full w-full flex-col items-center justify-center"
                      style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}
                    >
                      <i className="fa-solid fa-map text-3xl mb-2" aria-hidden="true" />
                      <span className="text-sm font-medium">
                        No custom map uploaded yet. Click Upload Map above.
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Layer 2: SVG Arrows & Freehand Drawings */}
              <svg
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 10 }}
              >
                <defs>
                  {uniqueColors.map((hex) => {
                    const safeId = `arrow-${hex.replace('#', '')}`;
                    return (
                      <marker
                        key={safeId}
                        id={safeId}
                        markerWidth="10"
                        markerHeight="10"
                        refX="8"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 9 3.5, 0 7" fill={hex} />
                      </marker>
                    );
                  })}
                </defs>

                {/* Freehand Paths */}
                {drawings.map((path) => (
                  <g
                    key={path.id}
                    className={toolMode === 'select' ? 'pointer-events-auto cursor-pointer' : ''}
                    onClick={(e) => {
                      if (toolMode === 'select' && e.shiftKey) {
                        e.stopPropagation();
                        onRemoveDrawing(path.id);
                      }
                    }}
                  >
                    <path
                      d={pointsToSvgPath(path.points)}
                      fill="none"
                      stroke={path.color}
                      strokeWidth={path.width || 3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}

                {/* Live Pen Draft */}
                {draftPoints && draftPoints.length > 1 && (
                  <path
                    d={pointsToSvgPath(draftPoints)}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                )}

                {/* Directional Arrows */}
                {arrows.map((arrow) => {
                  const safeId = `arrow-${arrow.color.replace('#', '')}`;
                  return (
                    <line
                      key={arrow.id}
                      x1={arrow.x1}
                      y1={arrow.y1}
                      x2={arrow.x2}
                      y2={arrow.y2}
                      stroke={arrow.color}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      markerEnd={`url(#${safeId})`}
                    />
                  );
                })}

                {/* Live Arrow Draft */}
                {draftArrow && (
                  <line
                    x1={draftArrow.x1}
                    y1={draftArrow.y1}
                    x2={draftArrow.x2}
                    y2={draftArrow.y2}
                    stroke={draftArrow.color}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    markerEnd={`url(#arrow-${draftArrow.color.replace('#', '')})`}
                    opacity={0.85}
                  />
                )}
              </svg>

              {/* Quick delete handles for arrows & drawings in Select mode */}
              {toolMode === 'select' && (
                <>
                  {arrows.map((arrow) => {
                    const midX = (arrow.x1 + arrow.x2) / 2;
                    const midY = (arrow.y1 + arrow.y2) / 2;
                    return (
                      <button
                        key={`del-${arrow.id}`}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveArrow(arrow.id);
                        }}
                        title="Remove arrow"
                        className="absolute flex h-4 w-4 items-center justify-center rounded-full opacity-35 hover:opacity-100 transition-opacity cursor-pointer"
                        style={{
                          left: `${midX - 8}px`,
                          top: `${midY - 8}px`,
                          zIndex: 15,
                          backgroundColor: '#0f172a',
                          border: `1px solid ${arrow.color}`,
                          color: '#f8fafc',
                          fontSize: '9px',
                        }}
                      >
                        ×
                      </button>
                    );
                  })}
                  {drawings.map((path) => {
                    const anchor = path.points[0];
                    if (!anchor) return null;
                    return (
                      <button
                        key={`del-${path.id}`}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveDrawing(path.id);
                        }}
                        title="Remove drawing"
                        className="absolute flex h-4 w-4 items-center justify-center rounded-full opacity-35 hover:opacity-100 transition-opacity cursor-pointer"
                        style={{
                          left: `${anchor.x - 8}px`,
                          top: `${anchor.y - 8}px`,
                          zIndex: 15,
                          backgroundColor: '#0f172a',
                          border: `1px solid ${path.color}`,
                          color: '#f8fafc',
                          fontSize: '9px',
                        }}
                      >
                        ×
                      </button>
                    );
                  })}
                </>
              )}

              {/* Layer 3: Tactical Sticky Notes */}
              {notes.map((note) => {
                const isEditing = editingNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    onMouseDown={(e) => {
                      if (isEditing) return;
                      e.stopPropagation();
                      const pt = clientToCanvasCoords(e.clientX, e.clientY);
                      dragRef.current = {
                        kind: 'note',
                        id: note.id,
                        offsetX: pt.x - note.x,
                        offsetY: pt.y - note.y,
                      };
                    }}
                    className="group absolute"
                    style={{
                      left: `${note.x}px`,
                      top: `${note.y}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 25,
                      width: '164px',
                      backgroundColor: '#0f172a',
                      border: `1.5px solid ${note.color || '#f59e0b'}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                      boxShadow: '0 4px 12px rgba(2, 6, 23, 0.7)',
                      cursor: isEditing ? 'text' : 'grab',
                    }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span
                        className="text-[10px] font-semibold tracking-wide"
                        style={{ color: note.color || '#f59e0b' }}
                      >
                        <i className="fa-solid fa-note-sticky mr-1" aria-hidden="true" />
                        NOTE
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNoteId(isEditing ? null : note.id);
                          }}
                          title={isEditing ? 'Done editing' : 'Edit note'}
                          className="opacity-60 hover:opacity-100 cursor-pointer"
                          style={{ color: '#cbd5e1', fontSize: '10px' }}
                        >
                          <i className={`fa-solid ${isEditing ? 'fa-check' : 'fa-pen'}`} />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveNote(note.id);
                          }}
                          title="Remove note"
                          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          style={{
                            color: '#fda4af',
                            fontSize: '11px',
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={note.text}
                        autoFocus
                        rows={2}
                        placeholder="Enter callout..."
                        onChange={(e) => onUpdateNoteText(note.id, e.target.value)}
                        onBlur={() => setEditingNoteId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            setEditingNoteId(null);
                          }
                        }}
                        className="w-full resize-none rounded px-1 py-0.5 text-xs focus:outline-none"
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                        }}
                      />
                    ) : (
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingNoteId(note.id);
                        }}
                        className="text-xs leading-snug break-words"
                        style={{ color: note.text ? '#f1f5f9' : '#64748b' }}
                      >
                        {note.text || 'Double-click to edit'}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Layer 4: Map Tactical Icons */}
              {placedIcons.map((icon) => {
                const meta = MAP_ICONS_META[icon.type];
                const customObjUrl = mapObjectIcons[icon.type];
                return (
                  <div
                    key={icon.id}
                    onMouseDown={(e) => {
                      if (e.button !== 0 || toolMode !== 'select') return;
                      e.stopPropagation();
                      const pt = clientToCanvasCoords(e.clientX, e.clientY);
                      dragRef.current = {
                        kind: 'icon',
                        id: icon.id,
                        offsetX: pt.x - icon.x,
                        offsetY: pt.y - icon.y,
                      };
                    }}
                    title={icon.label || meta.label}
                    className="group absolute flex flex-col items-center"
                    style={{
                      left: `${icon.x}px`,
                      top: `${icon.y}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 30,
                      cursor: toolMode === 'select' ? 'grab' : 'default',
                    }}
                  >
                    <div
                      className="relative flex items-center justify-center rounded-lg"
                      style={{
                        width: icon.type === 'boss' ? '40px' : '34px',
                        height: icon.type === 'boss' ? '40px' : '34px',
                        backgroundColor: customObjUrl ? 'transparent' : meta.bgHex,
                        color: meta.accentHex,
                        boxShadow: customObjUrl ? 'none' : '0 4px 10px rgba(2, 6, 23, 0.75)',
                      }}
                    >
                      {customObjUrl ? (
                        <img
                          src={customObjUrl}
                          alt={meta.label}
                          referrerPolicy="no-referrer"
                          style={{
                            width: icon.type === 'boss' ? '34px' : '28px',
                            height: icon.type === 'boss' ? '34px' : '28px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <i
                          className={`${meta.faIcon} ${icon.type === 'boss' ? 'text-base' : 'text-sm'}`}
                          aria-hidden="true"
                        />
                      )}

                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveIcon(icon.id);
                        }}
                        title={`Remove ${meta.label}`}
                        className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        style={{
                          backgroundColor: '#e11d48',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          border: '1px solid #0f172a',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Layer 5: Placed Player Tokens */}
              {placedPlayers.map((token) => {
                const roleMeta = ROLE_META[token.role];
                const customRoleUrl = roleIcons[token.role];
                const roleBorderHex =
                  (customRoleUrl && roleIconColors[token.role]) || roleMeta.borderHex;
                const loadoutBadges = [
                  { kind: 'Path', name: token.path1, icon: findAssetIcon(token.path1, pathIcons) },
                  { kind: 'Weapon', name: token.weapon1, icon: findAssetIcon(token.weapon1, weaponIcons) },
                  { kind: 'Path', name: token.path2, icon: findAssetIcon(token.path2, pathIcons) },
                  { kind: 'Weapon', name: token.weapon2, icon: findAssetIcon(token.weapon2, weaponIcons) },
                ].filter((b) => Boolean(b.icon));

                const tooltipSummary = [
                  `${token.name} (${token.role})`,
                  token.team ? token.team : null,
                  token.path1 || token.weapon1
                    ? `1: ${[token.path1, token.weapon1].filter(Boolean).join(' · ')}`
                    : null,
                  token.path2 || token.weapon2
                    ? `2: ${[token.path2, token.weapon2].filter(Boolean).join(' · ')}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' | ');

                const isExpanded = expandedTokenIds.has(token.id);

                return (
                  <div
                    key={token.id}
                    onMouseDown={(e) => {
                      if (e.button !== 0 || toolMode !== 'select') return;
                      e.stopPropagation();
                      const pt = clientToCanvasCoords(e.clientX, e.clientY);
                      dragRef.current = {
                        kind: 'player',
                        id: token.id,
                        offsetX: pt.x - token.x,
                        offsetY: pt.y - token.y,
                      };
                    }}
                    title={tooltipSummary}
                    className="group absolute flex flex-col items-center"
                    style={{
                      left: `${token.x}px`,
                      top: `${token.y}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex:
                        hoveredBadge?.tokenId === token.id ? 60 : isExpanded ? 52 : 40,
                      cursor: toolMode === 'select' ? 'grab' : 'default',
                    }}
                  >
                    {/* Floating Tooltip for Hovered Path / Weapon Logo */}
                    {hoveredBadge?.tokenId === token.id && (
                      <div
                        className="pointer-events-none absolute -top-7 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: '#020617',
                          color: hoveredBadge.color || '#f8fafc',
                          border: `1px solid ${hoveredBadge.color || '#64748b'}`,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.75)',
                          zIndex: 70,
                        }}
                      >
                        {hoveredBadge.label}
                      </div>
                    )}

                    <div
                      className="relative flex h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: customRoleUrl ? 'transparent' : roleMeta.bgHex,
                        color: roleMeta.textHex,
                        boxShadow: customRoleUrl ? 'none' : '0 4px 12px rgba(2, 6, 23, 0.85)',
                      }}
                    >
                      {customRoleUrl ? (
                        <img
                          src={customRoleUrl}
                          alt={token.role}
                          referrerPolicy="no-referrer"
                          style={{
                            width: '30px',
                            height: '30px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <i className={`${roleMeta.faIcon} text-xs`} aria-hidden="true" />
                      )}

                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePlayer(token.id);
                        }}
                        title={`Remove ${token.name}`}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        style={{
                          backgroundColor: '#e11d48',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          border: '1px solid #0f172a',
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        nameDownPosRef.current = {
                          id: token.id,
                          x: e.clientX,
                          y: e.clientY,
                        };
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const down = nameDownPosRef.current;
                        nameDownPosRef.current = null;
                        if (down && down.id === token.id) {
                          const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
                          if (dist >= 5) return;
                        }
                        if (loadoutBadges.length === 0) return;
                        setExpandedTokenIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(token.id)) {
                            next.delete(token.id);
                          } else {
                            next.add(token.id);
                          }
                          return next;
                        });
                      }}
                      title={
                        loadoutBadges.length > 0
                          ? isExpanded
                            ? 'Click name to hide Path & Weapon'
                            : 'Click name to show Path & Weapon'
                          : tooltipSummary
                      }
                      className="mt-1 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        color: '#f8fafc',
                        border: `1px solid ${roleBorderHex}`,
                        cursor: loadoutBadges.length > 0 ? 'pointer' : 'inherit',
                      }}
                    >
                      <span>{token.name}</span>
                    </button>

                    {/* Path & Weapon Logo Row (Shown only when player name is clicked) */}
                    {isExpanded && loadoutBadges.length > 0 && (
                      <div
                        className="mt-1 flex items-center rounded"
                        style={{
                          gap: '4px',
                          padding: '2px 4px',
                          backgroundColor: 'rgba(2, 6, 23, 0.82)',
                        }}
                      >
                        {loadoutBadges.map((badge, bIdx) => {
                          const pathAccent =
                            badge.kind === 'Path'
                              ? badge.icon!.accentColor || '#94a3b8'
                              : '#475569';
                          return (
                            <img
                              key={`${badge.kind}-${badge.name}-${bIdx}`}
                              src={badge.icon!.imageDataUrl}
                              alt={badge.icon!.name}
                              title={`${badge.kind}: ${badge.icon!.name}`}
                              referrerPolicy="no-referrer"
                              onMouseEnter={() =>
                                setHoveredBadge({
                                  tokenId: token.id,
                                  label: `${badge.kind}: ${badge.icon!.name}`,
                                  color: badge.kind === 'Path' ? pathAccent : '#e2e8f0',
                                })
                              }
                              onMouseLeave={() => setHoveredBadge(null)}
                              style={{
                                width: '24px',
                                height: '24px',
                                objectFit: 'contain',
                                display: 'block',
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
    </main>
  );
};
