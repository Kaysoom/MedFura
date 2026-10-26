import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface InAppSelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
}

interface InAppSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: InAppSelectOption<T>[];
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'adaptive';
  inlineExpand?: boolean;
}

export function InAppSelect<T extends string = string>({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'اختر...',
  className = '',
  triggerClassName = '',
  icon,
  size = 'md',
  variant = 'dark',
  inlineExpand = false,
}: InAppSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizePadding =
    size === 'sm'
      ? 'py-1.5 px-3 text-xs rounded-xl min-h-[38px]'
      : size === 'lg'
      ? 'py-3 px-4 text-xs sm:text-sm rounded-2xl min-h-[46px]'
      : 'py-2.5 px-3.5 text-xs sm:text-sm rounded-xl min-h-[42px]';

  const baseTheme =
    variant === 'adaptive'
      ? 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
      : 'bg-[#131D2E] border-slate-800 text-white';

  const panelTheme =
    variant === 'adaptive'
      ? 'bg-white dark:bg-[#0E172A] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
      : 'bg-[#0E172A] border-slate-700/90 text-white';

  return (
    <div ref={containerRef} className={`relative text-right min-w-0 ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full border font-bold flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-hidden ${sizePadding} ${baseTheme} ${
          isOpen
            ? 'border-emerald-500/70 ring-2 ring-emerald-500/20'
            : 'hover:border-emerald-500/40'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          <span className="truncate block text-right flex-1">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`${
            inlineExpand
              ? 'mt-2 w-full'
              : 'absolute z-[70] top-full mt-1.5 w-full right-0 left-0 shadow-2xl shadow-black/50 backdrop-blur-md'
          } rounded-2xl border p-1.5 space-y-1 max-h-60 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-150 ${panelTheme}`}
          role="listbox"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                    : variant === 'adaptive'
                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    : 'text-slate-300 hover:bg-[#162238] hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="truncate flex-1">{opt.label}</span>
                  {opt.badge && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold shrink-0">
                      {opt.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border border-slate-700 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
