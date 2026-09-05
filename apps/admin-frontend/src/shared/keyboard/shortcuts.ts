import { useSyncExternalStore } from 'react';
import { modifierGlyph } from './platform';

export interface Shortcut {
  id: string;
  key: string;
  description: string;
  handler: () => void;
  modified?: boolean | undefined;
}

const ENABLED_STORAGE_KEY = 'admin-shortcuts-enabled';

function readStoredEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;
  return target.getAttribute('role') === 'textbox';
}

function isDialogOpen(): boolean {
  // A closing dialog stays mounted with [data-closed] until its exit transition finishes —
  // match only the open ones, or a lingering close animation would suppress shortcuts forever.
  return document.querySelector('[role="dialog"][data-open]') !== null;
}

type Listener = () => void;

class ShortcutRegistry {
  private shortcuts = new Map<string, Shortcut>();
  private registryListeners = new Set<Listener>();
  private cachedList: Shortcut[] | null = null;
  private enabled = readStoredEnabled();
  private enabledListeners = new Set<Listener>();
  private hasKeyboardDevice = false;
  private keyboardListeners = new Set<Listener>();

  constructor() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  register = (shortcut: Shortcut): (() => void) => {
    this.shortcuts.set(shortcut.id, shortcut);
    this.notifyRegistry();
    return () => {
      this.shortcuts.delete(shortcut.id);
      this.notifyRegistry();
    };
  };

  getShortcut = (id: string): Shortcut | undefined => this.shortcuts.get(id);

  // Cached so useSyncExternalStore's getSnapshot returns a stable reference between
  // registrations — a fresh array every call reads to React as a perpetually-changing snapshot.
  list = (): Shortcut[] => {
    this.cachedList ??= [...this.shortcuts.values()];
    return this.cachedList;
  };

  private notifyRegistry(): void {
    this.cachedList = null;
    this.registryListeners.forEach((listener) => listener());
  }

  subscribeRegistry = (listener: Listener): (() => void) => {
    this.registryListeners.add(listener);
    return () => {
      this.registryListeners.delete(listener);
    };
  };

  getEnabledSnapshot = (): boolean => this.enabled;

  setEnabled = (enabled: boolean): void => {
    this.enabled = enabled;
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled));
    } catch {
      // A private-mode Safari throw here must not stop the preference from applying in-memory.
    }
    this.enabledListeners.forEach((listener) => listener());
  };

  subscribeEnabled = (listener: Listener): (() => void) => {
    this.enabledListeners.add(listener);
    return () => {
      this.enabledListeners.delete(listener);
    };
  };

  getKeyboardDeviceSnapshot = (): boolean => this.hasKeyboardDevice;

  subscribeKeyboardDevice = (listener: Listener): (() => void) => {
    this.keyboardListeners.add(listener);
    return () => {
      this.keyboardListeners.delete(listener);
    };
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    this.markKeyboardDevice();

    for (const shortcut of this.shortcuts.values()) {
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

      if (shortcut.modified) {
        if (!(event.ctrlKey || event.metaKey)) continue;
      } else {
        if (!this.enabled) continue;
        if (event.ctrlKey || event.metaKey || event.altKey) continue;
        if (isTypingTarget(event.target)) continue;
        if (isDialogOpen()) continue;
      }

      event.preventDefault();
      shortcut.handler();
      return;
    }
  };

  private markKeyboardDevice(): void {
    if (this.hasKeyboardDevice) return;
    this.hasKeyboardDevice = true;
    document.documentElement.dataset.kbd = 'true';
    this.keyboardListeners.forEach((listener) => listener());
  }

  // test-only
  reset(): void {
    this.shortcuts.clear();
    this.cachedList = null;
    this.registryListeners.clear();
    this.enabled = readStoredEnabled();
    this.enabledListeners.clear();
    this.hasKeyboardDevice = false;
    delete document.documentElement.dataset.kbd;
    this.keyboardListeners.clear();
  }
}

export const shortcutRegistry = new ShortcutRegistry();

export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(
    shortcutRegistry.subscribeEnabled,
    shortcutRegistry.getEnabledSnapshot,
  );
}

export function useHasKeyboardDevice(): boolean {
  return useSyncExternalStore(
    shortcutRegistry.subscribeKeyboardDevice,
    shortcutRegistry.getKeyboardDeviceSnapshot,
  );
}

export function useRegisteredShortcut(id: string): Shortcut | undefined {
  return useSyncExternalStore(shortcutRegistry.subscribeRegistry, () =>
    shortcutRegistry.getShortcut(id),
  );
}

export function useShortcutList(): Shortcut[] {
  return useSyncExternalStore(shortcutRegistry.subscribeRegistry, shortcutRegistry.list);
}

const HOVER_FINE_QUERY = '(hover: hover) and (pointer: fine)';

function getHoverFineSnapshot(): boolean {
  return window.matchMedia(HOVER_FINE_QUERY).matches;
}

function subscribeHoverFine(onChange: () => void): () => void {
  const media = window.matchMedia(HOVER_FINE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** T109's rendering gate: shortcutsEnabled AND ((hover:hover) and (pointer:fine) OR html[data-kbd]). */
export function useShortcutHintsVisible(): boolean {
  const enabled = useShortcutsEnabled();
  const canHoverFine = useSyncExternalStore(subscribeHoverFine, getHoverFineSnapshot);
  const hasKeyboardDevice = useHasKeyboardDevice();
  return enabled && (canHoverFine || hasKeyboardDevice);
}

export function formatShortcutKey(shortcut: Pick<Shortcut, 'key' | 'modified'>): string {
  const upperKey =
    shortcut.key.length === 1 && /[a-z]/i.test(shortcut.key)
      ? shortcut.key.toUpperCase()
      : shortcut.key;
  if (!shortcut.modified) return upperKey;
  const glyph = modifierGlyph();
  return glyph === '⌘' ? `${glyph}${upperKey}` : `${glyph}+${upperKey}`;
}

export interface ShortcutHint {
  key: string | undefined;
  displayKey: string | undefined;
  visible: boolean;
}

/** A tier-A/B control's resting keycap and aria-keyshortcuts value, derived from the registry. */
export function useShortcutHint(id: string): ShortcutHint {
  const shortcut = useRegisteredShortcut(id);
  const hintsVisible = useShortcutHintsVisible();
  return {
    key: shortcut?.key,
    displayKey: shortcut ? formatShortcutKey(shortcut) : undefined,
    visible: hintsVisible && !!shortcut,
  };
}
