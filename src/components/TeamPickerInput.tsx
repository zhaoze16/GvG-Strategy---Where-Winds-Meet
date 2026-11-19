import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface TeamOption {
  name: string;
  count: number;
}

interface TeamPickerInputProps {
  value: string;
  onChange: (val: string) => void;
  teams: TeamOption[];
  placeholder?: string;
}

export const TeamPickerInput: React.FC<TeamPickerInputProps> = ({
  value,
  onChange,
  teams,
  placeholder = 'Pick or type squad...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExactMatch = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return false;
    return teams.some((t) => t.name.trim().toLowerCase() === q);
  }, [teams, value]);

  const filteredTeams = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || isExactMatch) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [isExactMatch, teams, value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const trimmedValue = value.trim();

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 focus-within:border-blue-500">
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(true);
            }}
            title="Clear squad"
            className="shrink-0 px-1.5 text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle squad selector"
          className="shrink-0 border-l border-slate-800 px-2 py-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <i
            className={`fa-solid fa-chevron-down text-[10px] transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 min-w-full w-max max-w-xs overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl">
          {filteredTeams.length === 0 && !trimmedValue ? (
            <div className="px-2.5 py-2 text-[11px] text-slate-400">
              Type a squad name to create one.
            </div>
          ) : (
            <div className="space-y-0.5">
              {trimmedValue && !isExactMatch && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(trimmedValue);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-left text-xs text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
                  <span className="truncate font-medium">
                    New squad: &ldquo;{trimmedValue}&rdquo;
                  </span>
                </button>
              )}

              {filteredTeams.map((team) => {
                const isSelected =
                  team.name.trim().toLowerCase() === trimmedValue.toLowerCase();
                return (
                  <button
                    key={team.name}
                    type="button"
                    onClick={() => {
                      onChange(team.name);
                      setIsOpen(false);
                    }}
                    title={team.name}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/25 text-amber-300'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <i
                        className="fa-solid fa-people-group text-[10px] text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium">{team.name}</span>
                    </span>
                    <span className="shrink-0 font-mono-tabular text-[10px] text-slate-400">
                      {team.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
