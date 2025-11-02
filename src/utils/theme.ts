import { useEffect } from 'react';
import { useStore } from '../store';

export function useApplyTheme() {
  const theme = useStore((s) => s.config.theme);
  useEffect(() => {
    const root = document.documentElement;
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && sysDark);
    root.classList.toggle('dark', isDark);
  }, [theme]);
}

