import React from 'react';

export function Slider({ value, onChange, min = 0, max = 100, step = 1, ariaLabel }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; ariaLabel?: string }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-neutral-900 dark:accent-neutral-100"
    />
  );
}

