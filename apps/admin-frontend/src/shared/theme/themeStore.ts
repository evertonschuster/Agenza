import { resolveTheme, THEME_STORAGE_KEY, type ResolvedTheme, type ThemeChoice } from './theme';

type Listener = () => void;

export interface ThemeSnapshot {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
}

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function readStoredChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function applyToDocument(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#111318' : '#f5f6f8');
}

class ThemeStore {
  private media: MediaQueryList = window.matchMedia(DARK_MEDIA_QUERY);
  private choice: ThemeChoice = readStoredChoice();
  private snapshot: ThemeSnapshot = {
    choice: this.choice,
    resolved: resolveTheme(this.choice, this.media.matches),
  };
  private listeners = new Set<Listener>();

  constructor() {
    this.media.addEventListener('change', this.handleSystemChange);
    applyToDocument(this.snapshot.resolved);
  }

  getSnapshot = (): ThemeSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setChoice = (choice: ThemeChoice): void => {
    this.choice = choice;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    } catch {
      // A private-mode Safari throw here must not stop the theme from applying in-memory.
    }
    this.recompute();
  };

  private handleSystemChange = (): void => {
    if (this.choice === 'system') {
      this.recompute();
    }
  };

  private recompute(): void {
    const resolved = resolveTheme(this.choice, this.media.matches);
    if (resolved === this.snapshot.resolved && this.choice === this.snapshot.choice) return;
    this.snapshot = { choice: this.choice, resolved };
    applyToDocument(resolved);
    this.listeners.forEach((listener) => listener());
  }

  // test-only: re-reads storage and re-subscribes to matchMedia, so a test can swap the
  // window.matchMedia mock between cases and have this store pick it up.
  reset(): void {
    this.media.removeEventListener('change', this.handleSystemChange);
    this.media = window.matchMedia(DARK_MEDIA_QUERY);
    this.media.addEventListener('change', this.handleSystemChange);
    this.choice = readStoredChoice();
    this.snapshot = {
      choice: this.choice,
      resolved: resolveTheme(this.choice, this.media.matches),
    };
    this.listeners.clear();
  }
}

export const themeStore = new ThemeStore();
