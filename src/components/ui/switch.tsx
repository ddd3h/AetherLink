import * as SwitchPr from '@radix-ui/react-switch';
import React from 'react';

export function Switch({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) {
  return (
    <SwitchPr.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="w-10 h-6 bg-neutral-300 dark:bg-neutral-700 data-[state=checked]:bg-neutral-900 dark:data-[state=checked]:bg-neutral-100 rounded-full relative transition-colors"
    >
      <SwitchPr.Thumb className="block w-5 h-5 bg-white dark:bg-neutral-900 rounded-full shadow translate-x-0.5 data-[state=checked]:translate-x-[1.375rem] transition-transform" />
    </SwitchPr.Root>
  );
}

