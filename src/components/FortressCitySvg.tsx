import React from 'react';

interface BastionProps {
  cx: number;
  cy: number;
}

const BastionTower: React.FC<BastionProps> = ({ cx, cy }) => (
  <g transform={`translate(${cx}, ${cy})`}>
    {/* Stone bastion plinth */}
    <rect
      x={-22}
      y={-22}
      width={44}
      height={44}
      rx={4}
      fill="#334155"
      stroke="#64748b"
      strokeWidth={2}
    />
    {/* Crenellation notches */}
    <rect x={-18} y={-18} width={36} height={36} rx={2} fill="#1e293b" stroke="#475569" strokeWidth={1} />
    {/* Traditional hip roof */}
    <polygon points="0,-16 16,0 0,16 -16,0" fill="#273549" stroke="#94a3b8" strokeWidth={1.2} />
    <line x1={-16} y1={0} x2={16} y2={0} stroke="#64748b" strokeWidth={1} />
    <line x1={0} y1={-16} x2={0} y2={16} stroke="#64748b" strokeWidth={1} />
    {/* Finial */}
    <circle cx={0} cy={0} r={3.5} fill="#d97706" stroke="#fde68a" strokeWidth={0.8} />
  </g>
);

interface GatehouseProps {
  cx: number;
  cy: number;
  orientation: 'horizontal' | 'vertical';
  label: string;
}

const Gatehouse: React.FC<GatehouseProps> = ({ cx, cy, orientation, label }) => {
  const rotate = orientation === 'vertical' ? 90 : 0;
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <g transform={`rotate(${rotate})`}>
        {/* Stone gate flanking piers */}
        <rect x={-48} y={-20} width={24} height={40} rx={2} fill="#334155" stroke="#64748b" strokeWidth={1.5} />
        <rect x={24} y={-20} width={24} height={40} rx={2} fill="#334155" stroke="#64748b" strokeWidth={1.5} />
        {/* Gate passageway */}
        <rect x={-24} y={-18} width={48} height={36} fill="#1e293b" stroke="#475569" strokeWidth={1} />
        {/* Pagoda Gatehouse Roof */}
        <polygon
          points="-38,-14 38,-14 44,0 38,14 -38,14 -44,0"
          fill="#263449"
          stroke="#94a3b8"
          strokeWidth={1.4}
        />
        <line x1={-32} y1={0} x2={32} y2={0} stroke="#cbd5e1" strokeWidth={1.5} />
        <line x1={-38} y1={-14} x2={-32} y2={0} stroke="#64748b" strokeWidth={1} />
        <line x1={-38} y1={14} x2={-32} y2={0} stroke="#64748b" strokeWidth={1} />
        <line x1={38} y1={-14} x2={32} y2={0} stroke="#64748b" strokeWidth={1} />
        <line x1={38} y1={14} x2={32} y2={0} stroke="#64748b" strokeWidth={1} />
        <circle cx={0} cy={0} r={3} fill="#f59e0b" />
      </g>
      <text
        x={0}
        y={orientation === 'horizontal' ? (cy < 450 ? -28 : 36) : 0}
        dx={orientation === 'vertical' ? (cx < 600 ? -36 : 36) : 0}
        dy={orientation === 'vertical' ? 4 : 0}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        letterSpacing="1.2"
      >
        {label}
      </text>
    </g>
  );
};

interface CompoundProps {
  x: number;
  y: number;
  w: number;
  h: number;
  courtyard?: boolean;
}

const CourtyardCompound: React.FC<CompoundProps> = ({ x, y, w, h, courtyard = true }) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Compound wall / courtyard floor */}
    <rect x={0} y={0} width={w} height={h} rx={2} fill="#162133" stroke="#334155" strokeWidth={1.2} />
    {courtyard ? (
      <>
        {/* Inner courtyard square */}
        <rect x={14} y={14} width={w - 28} height={h - 28} fill="#101827" stroke="#283548" strokeWidth={1} />
        {/* North Hall */}
        <rect x={6} y={4} width={w - 12} height={14} fill="#253447" stroke="#64748b" strokeWidth={1} />
        <line x1={8} y1={11} x2={w - 8} y2={11} stroke="#94a3b8" strokeWidth={1} />
        {/* South Hall */}
        <rect x={6} y={h - 18} width={w - 12} height={14} fill="#253447" stroke="#64748b" strokeWidth={1} />
        <line x1={8} y1={h - 11} x2={w - 8} y2={h - 11} stroke="#94a3b8" strokeWidth={1} />
        {/* West Wing */}
        <rect x={4} y={20} width={12} height={h - 40} fill="#212e40" stroke="#475569" strokeWidth={1} />
        {/* East Wing */}
        <rect x={w - 16} y={20} width={12} height={h - 40} fill="#212e40" stroke="#475569" strokeWidth={1} />
      </>
    ) : (
      <>
        {/* Single Pavilion Roof */}
        <rect x={4} y={4} width={w - 8} height={h - 8} fill="#253447" stroke="#64748b" strokeWidth={1.1} />
        <line x1={6} y1={h / 2} x2={w - 6} y2={h / 2} stroke="#94a3b8" strokeWidth={1} />
        <line x1={4} y1={4} x2={12} y2={h / 2} stroke="#475569" strokeWidth={0.8} />
        <line x1={4} y1={h - 4} x2={12} y2={h / 2} stroke="#475569" strokeWidth={0.8} />
        <line x1={w - 4} y1={4} x2={w - 12} y2={h / 2} stroke="#475569" strokeWidth={0.8} />
        <line x1={w - 4} y1={h - 4} x2={w - 12} y2={h / 2} stroke="#475569" strokeWidth={0.8} />
      </>
    )}
  </g>
);

interface TreeClusterProps {
  trees: Array<{ x: number; y: number; r: number }>;
}

const GreeneryCluster: React.FC<TreeClusterProps> = ({ trees }) => (
  <g>
    {trees.map((t, i) => (
      <g key={i} transform={`translate(${t.x}, ${t.y})`}>
        <circle cx={2} cy={3} r={t.r} fill="#071310" opacity={0.55} />
        <circle cx={0} cy={0} r={t.r} fill="#144534" stroke="#1f634c" strokeWidth={1} />
        <circle cx={-t.r * 0.2} cy={-t.r * 0.2} r={t.r * 0.65} fill="#1a5943" />
        <circle cx={-t.r * 0.25} cy={-t.r * 0.25} r={t.r * 0.3} fill="#257558" />
      </g>
    ))}
  </g>
);

interface BoatProps {
  x: number;
  y: number;
  angle: number;
}

const WoodenBoat: React.FC<BoatProps> = ({ x, y, angle }) => (
  <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
    {/* Water wake */}
    <ellipse cx={0} cy={0} rx={21} ry={8} fill="#1e6080" opacity={0.35} />
    {/* Wooden hull */}
    <path
      d="M -16,0 Q -10,-6 0,-6 Q 10,-6 16,0 Q 10,6 0,6 Q -10,6 -16,0 Z"
      fill="#78492a"
      stroke="#b47b4e"
      strokeWidth={1}
    />
    {/* Deck ribs */}
    <line x1={-7} y1={-4.5} x2={-7} y2={4.5} stroke="#522f18" strokeWidth={0.9} />
    <line x1={7} y1={-4.5} x2={7} y2={4.5} stroke="#522f18" strokeWidth={0.9} />
    {/* Woven bamboo canopy */}
    <rect x={-4} y={-4} width={8} height={8} rx={1.5} fill="#a16b3f" stroke="#d4a373" strokeWidth={0.8} />
  </g>
);

interface CanalBridgeProps {
  x: number;
  y: number;
  angle: number;
}

const CanalBridge: React.FC<CanalBridgeProps> = ({ x, y, angle }) => (
  <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
    <rect x={-9} y={-20} width={18} height={40} rx={2} fill="#475569" stroke="#94a3b8" strokeWidth={1} />
    <line x1={-9} y1={-12} x2={9} y2={-12} stroke="#334155" strokeWidth={1} />
    <line x1={-9} y1={-4} x2={9} y2={-4} stroke="#334155" strokeWidth={1} />
    <line x1={-9} y1={4} x2={9} y2={4} stroke="#334155" strokeWidth={1} />
    <line x1={-9} y1={12} x2={9} y2={12} stroke="#334155" strokeWidth={1} />
    <line x1={-9} y1={-20} x2={-9} y2={20} stroke="#cbd5e1" strokeWidth={1.4} />
    <line x1={9} y1={-20} x2={9} y2={20} stroke="#cbd5e1" strokeWidth={1.4} />
  </g>
);

export const FortressCitySvg: React.FC = () => {
  // Chamfered outer wall octagon points (8 vertices -> 8 bastion towers)
  const outerWallPoints = '260,105 940,105 1035,200 1035,700 940,795 260,795 165,700 165,200';
  const innerMoatPoints = '240,65 960,65 1075,180 1075,720 960,835 240,835 125,720 125,180';
  const outerMoatPoints = '220,38 980,38 1105,163 1105,737 980,862 220,862 95,737 95,163';

  return (
    <svg
      width={1200}
      height={900}
      viewBox="0 0 1200 900"
      xmlns="http://www.w3.org/2000/svg"
      className="block select-none"
    >
      <defs>
        <radialGradient id="moatGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#143247" />
          <stop offset="100%" stopColor="#0b1d2e" />
        </radialGradient>
        <pattern id="stoneTile" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#131c2e" />
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1b263b" strokeWidth="0.8" />
        </pattern>
        <pattern id="avenueStone" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#212d42" />
          <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#2c3b54" strokeWidth="0.7" />
        </pattern>
      </defs>

      {/* Outer Battlefield Terrain */}
      <rect width={1200} height={900} fill="#0b1322" />
      {/* Subtle terrain elevation lines outside moat */}
      <polygon
        points="205,18 995,18 1128,150 1128,750 995,882 205,882 72,750 72,150"
        fill="none"
        stroke="#162238"
        strokeWidth={1.5}
        strokeDasharray="6 6"
      />

      {/* Surrounding Moat Water */}
      <polygon points={outerMoatPoints} fill="#0e344d" stroke="#185173" strokeWidth={2.5} />
      {/* Moat water shimmer contour */}
      <polygon
        points="230,52 970,52 1090,172 1090,728 970,848 230,848 110,728 110,172"
        fill="none"
        stroke="#1b5d82"
        strokeWidth={1.2}
        strokeDasharray="18 10"
        opacity={0.7}
      />

      {/* Moat Inner Embankment */}
      <polygon points={innerMoatPoints} fill="#141e30" stroke="#334155" strokeWidth={2} />

      {/* 4 Cardinal Causeway Bridges across the Moat */}
      {/* North Bridge */}
      <rect x={570} y={32} width={60} height={78} fill="url(#avenueStone)" stroke="#64748b" strokeWidth={1.8} />
      <line x1={570} y1={32} x2={570} y2={110} stroke="#94a3b8" strokeWidth={2} />
      <line x1={630} y1={32} x2={630} y2={110} stroke="#94a3b8" strokeWidth={2} />
      {/* South Bridge */}
      <rect x={570} y={790} width={60} height={78} fill="url(#avenueStone)" stroke="#64748b" strokeWidth={1.8} />
      <line x1={570} y1={790} x2={570} y2={868} stroke="#94a3b8" strokeWidth={2} />
      <line x1={630} y1={790} x2={630} y2={868} stroke="#94a3b8" strokeWidth={2} />
      {/* West Bridge */}
      <rect x={88} y={420} width={82} height={60} fill="url(#avenueStone)" stroke="#64748b" strokeWidth={1.8} />
      <line x1={88} y1={420} x2={170} y2={420} stroke="#94a3b8" strokeWidth={2} />
      <line x1={88} y1={480} x2={170} y2={480} stroke="#94a3b8" strokeWidth={2} />
      {/* East Bridge */}
      <rect x={1030} y={420} width={82} height={60} fill="url(#avenueStone)" stroke="#64748b" strokeWidth={1.8} />
      <line x1={1030} y1={420} x2={1112} y2={420} stroke="#94a3b8" strokeWidth={2} />
      <line x1={1030} y1={480} x2={1112} y2={480} stroke="#94a3b8" strokeWidth={2} />

      {/* City Ground Floor inside Outer Walls */}
      <polygon points={outerWallPoints} fill="url(#stoneTile)" />

      {/* Outer Ring Road (inside perimeter walls) */}
      <polygon
        points="272,126 928,126 1012,210 1012,690 928,774 272,774 188,690 188,210"
        fill="none"
        stroke="#223047"
        strokeWidth={24}
      />
      <polygon
        points="272,126 928,126 1012,210 1012,690 928,774 272,774 188,690 188,210"
        fill="none"
        stroke="#334155"
        strokeWidth={1}
        strokeDasharray="8 6"
      />

      {/* Curved Water Canal — Northwest Quadrant */}
      <g>
        {/* Stone canal bank */}
        <path
          d="M 192,265 C 245,250 280,190 360,205 C 435,220 455,280 515,315"
          fill="none"
          stroke="#334155"
          strokeWidth={34}
          strokeLinecap="round"
        />
        {/* Canal water */}
        <path
          d="M 192,265 C 245,250 280,190 360,205 C 435,220 455,280 515,315"
          fill="none"
          stroke="#0f3f5c"
          strokeWidth={26}
          strokeLinecap="round"
        />
        <path
          d="M 192,265 C 245,250 280,190 360,205 C 435,220 455,280 515,315"
          fill="none"
          stroke="#23729e"
          strokeWidth={1.2}
          strokeDasharray="10 8"
          opacity={0.6}
        />
        {/* Arched Footbridges */}
        <CanalBridge x={275} y={222} angle={-36} />
        <CanalBridge x={436} y={258} angle={45} />
        {/* Wooden Boats */}
        <WoodenBoat x={345} y={203} angle={8} />
        <WoodenBoat x={222} y={256} angle={-18} />
      </g>

      {/* Curved Water Canal — Southeast Quadrant */}
      <g>
        {/* Stone canal bank */}
        <path
          d="M 685,585 C 745,620 765,680 840,695 C 920,710 955,650 1008,635"
          fill="none"
          stroke="#334155"
          strokeWidth={34}
          strokeLinecap="round"
        />
        {/* Canal water */}
        <path
          d="M 685,585 C 745,620 765,680 840,695 C 920,710 955,650 1008,635"
          fill="none"
          stroke="#0f3f5c"
          strokeWidth={26}
          strokeLinecap="round"
        />
        <path
          d="M 685,585 C 745,620 765,680 840,695 C 920,710 955,650 1008,635"
          fill="none"
          stroke="#23729e"
          strokeWidth={1.2}
          strokeDasharray="10 8"
          opacity={0.6}
        />
        {/* Arched Footbridges */}
        <CanalBridge x={764} y={642} angle={45} />
        <CanalBridge x={925} y={678} angle={-34} />
        {/* Wooden Boats */}
        <WoodenBoat x={845} y={696} angle={10} />
        <WoodenBoat x={972} y={648} angle={-22} />
      </g>

      {/* Inner Ring Road around the Citadel */}
      <circle cx={600} cy={450} r={192} fill="none" stroke="#223047" strokeWidth={28} />
      <circle cx={600} cy={450} r={206} fill="none" stroke="#334155" strokeWidth={1.2} />
      <circle cx={600} cy={450} r={178} fill="none" stroke="#334155" strokeWidth={1.2} />

      {/* North-South Axial Avenue */}
      <rect x={572} y={105} width={56} height={690} fill="url(#avenueStone)" stroke="#3b4c66" strokeWidth={1.4} />
      <line x1={600} y1={115} x2={600} y2={785} stroke="#475569" strokeWidth={1} strokeDasharray="12 8" />

      {/* East-West Axial Avenue */}
      <rect x={165} y={422} width={870} height={56} fill="url(#avenueStone)" stroke="#3b4c66" strokeWidth={1.4} />
      <line x1={175} y1={450} x2={1025} y2={450} stroke="#475569" strokeWidth={1} strokeDasharray="12 8" />

      {/* Courtyard Pavilions & Compound Buildings */}
      {/* NW Ward */}
      <CourtyardCompound x={215} y={300} w={118} h={94} courtyard />
      <CourtyardCompound x={352} y={310} w={84} h={84} courtyard={false} />
      <CourtyardCompound x={465} y={156} w={84} h={96} courtyard />

      {/* NE Ward */}
      <CourtyardCompound x={655} y={158} w={132} h={98} courtyard />
      <CourtyardCompound x={810} y={162} w={112} h={88} courtyard />
      <CourtyardCompound x={820} y={282} w={140} h={108} courtyard />
      <CourtyardCompound x={690} y={290} w={92} h={74} courtyard={false} />

      {/* SW Ward */}
      <CourtyardCompound x={235} y={510} w={142} h={108} courtyard />
      <CourtyardCompound x={275} y={648} w={114} h={92} courtyard />
      <CourtyardCompound x={415} y={644} w={128} h={96} courtyard />
      <CourtyardCompound x={416} y={536} w={90} h={74} courtyard={false} />

      {/* SE Ward */}
      <CourtyardCompound x={652} y={648} w={84} h={96} courtyard />
      <CourtyardCompound x={762} y={506} w={86} h={84} courtyard={false} />
      <CourtyardCompound x={868} y={506} w={118} h={94} courtyard />

      {/* Greenery Clusters */}
      {/* NW Gardens */}
      <GreeneryCluster
        trees={[
          { x: 270, y: 162, r: 13 },
          { x: 294, y: 155, r: 10 },
          { x: 318, y: 164, r: 14 },
          { x: 392, y: 158, r: 11 },
          { x: 416, y: 166, r: 13 },
          { x: 472, y: 372, r: 12 },
          { x: 495, y: 388, r: 10 },
        ]}
      />
      {/* NE Gardens */}
      <GreeneryCluster
        trees={[
          { x: 650, y: 274, r: 11 },
          { x: 794, y: 266, r: 10 },
          { x: 966, y: 230, r: 14 },
          { x: 980, y: 254, r: 11 },
          { x: 978, y: 396, r: 12 },
        ]}
      />
      {/* SW Gardens */}
      <GreeneryCluster
        trees={[
          { x: 214, y: 638, r: 13 },
          { x: 236, y: 662, r: 11 },
          { x: 218, y: 682, r: 12 },
          { x: 396, y: 514, r: 11 },
          { x: 548, y: 528, r: 10 },
        ]}
      />
      {/* SE Gardens */}
      <GreeneryCluster
        trees={[
          { x: 706, y: 526, r: 12 },
          { x: 730, y: 512, r: 10 },
          { x: 786, y: 736, r: 13 },
          { x: 812, y: 744, r: 11 },
          { x: 886, y: 738, r: 14 },
          { x: 912, y: 730, r: 11 },
        ]}
      />
      {/* Outer Perimeter Trees */}
      <GreeneryCluster
        trees={[
          { x: 58, y: 250, r: 14 },
          { x: 48, y: 280, r: 11 },
          { x: 1148, y: 270, r: 13 },
          { x: 1158, y: 300, r: 11 },
          { x: 52, y: 620, r: 14 },
          { x: 1152, y: 610, r: 15 },
          { x: 340, y: 20, r: 11 },
          { x: 860, y: 880, r: 12 },
        ]}
      />

      {/* Octagonal Inner Citadel Platform */}
      <g>
        {/* Outer Citadel Octagon Retaining Wall */}
        <polygon
          points="540,305 660,305 745,390 745,510 660,595 540,595 455,510 455,390"
          fill="#1b273b"
          stroke="#64748b"
          strokeWidth={3}
        />
        {/* Cardinal Citadel Stairways */}
        {/* North Stair */}
        <rect x={576} y={298} width={48} height={24} fill="#2c3b54" stroke="#64748b" strokeWidth={1.2} />
        <line x1={578} y1={305} x2={622} y2={305} stroke="#475569" strokeWidth={1} />
        <line x1={578} y1={312} x2={622} y2={312} stroke="#475569" strokeWidth={1} />
        {/* South Stair */}
        <rect x={576} y={578} width={48} height={24} fill="#2c3b54" stroke="#64748b" strokeWidth={1.2} />
        <line x1={578} y1={585} x2={622} y2={585} stroke="#475569" strokeWidth={1} />
        <line x1={578} y1={592} x2={622} y2={592} stroke="#475569" strokeWidth={1} />
        {/* West Stair */}
        <rect x={448} y={426} width={24} height={48} fill="#2c3b54" stroke="#64748b" strokeWidth={1.2} />
        <line x1={455} y1={428} x2={455} y2={472} stroke="#475569" strokeWidth={1} />
        <line x1={462} y1={428} x2={462} y2={472} stroke="#475569" strokeWidth={1} />
        {/* East Stair */}
        <rect x={728} y={426} width={24} height={48} fill="#2c3b54" stroke="#64748b" strokeWidth={1.2} />
        <line x1={735} y1={428} x2={735} y2={472} stroke="#475569" strokeWidth={1} />
        <line x1={742} y1={428} x2={742} y2={472} stroke="#475569" strokeWidth={1} />

        {/* Inner Raised Citadel Terrace */}
        <polygon
          points="550,326 650,326 724,400 724,500 650,574 550,574 476,500 476,400"
          fill="#223047"
          stroke="#475569"
          strokeWidth={1.5}
        />

        {/* Central Ceremonial Square */}
        <rect
          x={522}
          y={372}
          width={156}
          height={156}
          rx={6}
          fill="#182336"
          stroke="#64748b"
          strokeWidth={1.4}
        />
        {/* Ceremonial Courtyard Tiling Lines */}
        <line x1={522} y1={450} x2={678} y2={450} stroke="#334155" strokeWidth={1} />
        <line x1={600} y1={372} x2={600} y2={528} stroke="#334155" strokeWidth={1} />
        <circle cx={600} cy={450} r={54} fill="none" stroke="#475569" strokeWidth={1.2} strokeDasharray="4 4" />

        {/* Central Imperial Dais / Altar */}
        <polygon
          points="584,412 616,412 638,434 638,466 616,488 584,488 562,466 562,434"
          fill="#2b3b54"
          stroke="#d97706"
          strokeWidth={1.5}
        />
        <circle cx={600} cy={450} r={16} fill="#1e293b" stroke="#f59e0b" strokeWidth={1.2} />
        <circle cx={600} cy={450} r={5} fill="#f59e0b" opacity={0.85} />

        {/* 4 Courtyard Corner Pavilions inside Citadel */}
        <circle cx={536} cy={386} r={8} fill="#263449" stroke="#94a3b8" strokeWidth={1} />
        <circle cx={664} cy={386} r={8} fill="#263449" stroke="#94a3b8" strokeWidth={1} />
        <circle cx={536} cy={514} r={8} fill="#263449" stroke="#94a3b8" strokeWidth={1} />
        <circle cx={664} cy={514} r={8} fill="#263449" stroke="#94a3b8" strokeWidth={1} />
      </g>

      {/* Outer Perimeter Stone Walls */}
      <polygon
        points={outerWallPoints}
        fill="none"
        stroke="#475569"
        strokeWidth={18}
        strokeLinejoin="miter"
      />
      <polygon
        points={outerWallPoints}
        fill="none"
        stroke="#1e293b"
        strokeWidth={10}
        strokeLinejoin="miter"
      />
      <polygon
        points={outerWallPoints}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1.2}
        strokeDasharray="6 6"
        opacity={0.75}
      />

      {/* 8 Corner Bastion Towers */}
      <BastionTower cx={260} cy={105} />
      <BastionTower cx={940} cy={105} />
      <BastionTower cx={1035} cy={200} />
      <BastionTower cx={1035} cy={700} />
      <BastionTower cx={940} cy={795} />
      <BastionTower cx={260} cy={795} />
      <BastionTower cx={165} cy={700} />
      <BastionTower cx={165} cy={200} />

      {/* 4 Cardinal Gatehouses */}
      <Gatehouse cx={600} cy={105} orientation="horizontal" label="NORTH GATE" />
      <Gatehouse cx={600} cy={795} orientation="horizontal" label="SOUTH GATE" />
      <Gatehouse cx={165} cy={450} orientation="vertical" label="WEST GATE" />
      <Gatehouse cx={1035} cy={450} orientation="vertical" label="EAST GATE" />

      {/* Subtle Tactical Compass Rose (Top-Left Margin) */}
      <g transform="translate(52, 54)" opacity={0.75}>
        <circle cx={0} cy={0} r={20} fill="#0f172a" stroke="#334155" strokeWidth={1.2} />
        <polygon points="0,-16 4,-3 0,-6 -4,-3" fill="#f59e0b" />
        <polygon points="0,16 4,3 0,6 -4,3" fill="#64748b" />
        <polygon points="16,0 3,4 6,0 3,-4" fill="#64748b" />
        <polygon points="-16,0 -3,4 -6,0 -3,-4" fill="#64748b" />
        <text
          x={0}
          y={-24}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
        >
          N
        </text>
      </g>
    </svg>
  );
};
