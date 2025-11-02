import React from 'react';
import { cn } from '../../lib/utils';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-9 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-400',
        props.className
      )}
    />
  );
}

