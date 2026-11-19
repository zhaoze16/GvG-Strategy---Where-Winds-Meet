import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AssetIcon } from '../types/gvg';
import { findAssetIcon } from '../utils/storageAndSchema';

interface IconPickerInputProps {
  value: string;
  onChange: (val: string) => void;
  icons: AssetIcon[];
  prioritizedNames?: string[];
  placeholder?: string;
  emptyHint?: string;
}

export const IconPickerInput: React.FC<IconPickerInputProps> = ({
  value,
  onChange,
  icons,
  prioritizedNames = [],
  placeholder = 'Select or type...',
  emptyHint = 'No icons uploaded yet',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matchedIcon = useMemo(() => findAssetIcon(value, icons), [value, icons]);

  const prioritizedSet = useMemo(
    () => new Set(prioritizedNames.map((n) => n.trim().toLowerCase()).filter(Boolean)),
    [prioritizedNames]
  );

  const filteredIcons = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base =
      !q || matchedIcon
        ? icons
        : icons.filter((i) => i.name.toLowerCase().includes(q));

    if (prioritizedSet.size === 0) return base;
    return [...base].sort((a, b) => {
      const aPri = prioritizedSet.has(a.name.trim().toLowerCase()) ? 0 : 1;
      const bPri = prioritizedSet.has(b.name.trim().toLowerCase()) ? 0 : 1;
      return aPri - bPri;
    });
  }, [icons, matchedIcon, prioritizedSet, value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 focus-within:border-blue-500">
        {matchedIcon && (
          <img
            src={matchedIcon.imageDataUrl}
            alt={matchedIcon.name}
            referrerPolicy="no-referrer"
            className="ml-2 h-4 w-4 shrink-0 rounded-sm object-contain"
          />
        )}
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
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(true);
            }}
            title="Clear selection"
            className="shrink-0 px-1.5 text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle icon picker"
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
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 min-w-full w-max max-w-xs overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl">
          {icons.length === 0 ? (
            <div className="px-2.5 py-2 text-[11px] text-slate-400">{emptyHint}</div>
          ) : filteredIcons.length === 0 ? (
            <div className="px-2.5 py-2 text-[11px] text-slate-400">
              No matching icon. Using custom text &ldquo;{value}&rdquo;.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredIcons.map((icon) => {
                const isSelected =
                  icon.name.trim().toLowerCase() === value.trim().toLowerCase();
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => {
                      onChange(icon.name);
                      setIsOpen(false);
                    }}
                    title={icon.name}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/25 text-amber-300'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <img
                      src={icon.imageDataUrl}
                      alt={icon.name}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                    <span className="truncate font-medium">{icon.name}</span>
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
