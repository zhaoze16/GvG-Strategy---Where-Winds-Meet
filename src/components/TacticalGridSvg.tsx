import React from 'react';

export const TacticalGridSvg: React.FC = () => {
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const rows = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <svg
      width={1200}
      height={900}
      viewBox="0 0 1200 900"
      xmlns="http://www.w3.org/2000/svg"
      className="block select-none"
    >
      <defs>
        <pattern id="minorGrid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#162235" strokeWidth="0.7" />
        </pattern>
        <pattern id="majorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#minorGrid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#24344d" strokeWidth="1.2" />
        </pattern>
      </defs>

      <rect width={1200} height={900} fill="#0b1322" />
      <rect width={1200} height={900} fill="url(#majorGrid)" />

      {/* Tactical Range Rings */}
      <circle cx={600} cy={450} r={120} fill="none" stroke="#1e3a5f" strokeWidth={1.2} strokeDasharray="6 6" />
      <circle cx={600} cy={450} r={240} fill="none" stroke="#1e3a5f" strokeWidth={1.2} strokeDasharray="8 6" />
      <circle cx={600} cy={450} r={360} fill="none" stroke="#1e3a5f" strokeWidth={1.2} strokeDasharray="10 8" />

      {/* Cardinal Axes */}
      <line x1={600} y1={0} x2={600} y2={900} stroke="#334155" strokeWidth={1.5} />
      <line x1={0} y1={450} x2={1200} y2={450} stroke="#334155" strokeWidth={1.5} />
      <circle cx={600} cy={450} r={6} fill="#f59e0b" opacity={0.8} />

      {/* Sector Labels */}
      {cols.map((col, ci) =>
        rows.map((row, ri) => (
          <text
            key={`${col}${row}`}
            x={ci * 100 + 8}
            y={ri * 100 + 18}
            fill="#475569"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="500"
          >
            {col}
            {row}
          </text>
        ))
      )}
    </svg>
  );
};
