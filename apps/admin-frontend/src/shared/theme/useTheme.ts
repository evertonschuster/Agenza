import { useSyncExternalStore } from 'react';
import { themeStore } from './themeStore';
import type { ThemeChoice, ResolvedTheme } from './theme';

export interface UseThemeResult {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setTheme: (choice: ThemeChoice) => void;
}

export function useTheme(): UseThemeResult {
  const snapshot = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot);
  return { choice: snapshot.choice, resolved: snapshot.resolved, setTheme: themeStore.setChoice };
}
