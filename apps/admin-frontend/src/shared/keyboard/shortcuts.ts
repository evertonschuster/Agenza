import { useSyncExternalStore } from 'react';
import { modifierGlyph } from './platform';

export interface Shortcut {
  id: string;
  key: string;
  description: string;
  handler: () => void;
  modified?: boolean | undefined;
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

const KEYS_NEVER_FROM_A_TOUCH_KEYBOARD = new Set(['Tab', 'Escape']);

// A touch-only device can only ever fire keydown from its on-screen keyboard, which requires a
// focused field — so an unmodified, non-Tab/Escape key there is ordinary typing, not evidence of
// a real hardware keyboard (D4: touch devices get no shortcut hints).
function looksLikeRealKeyboard(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  if (KEYS_NEVER_FROM_A_TOUCH_KEYBOARD.has(event.key)) return true;
  return !isTypingTarget(event.target);
}

type Listener = () => void;

class ShortcutRegistry {
  private shortcuts = new Map<string, Shortcut>();
  private registryListeners = new Set<Listener>();
  private cachedList: Shortcut[] | null = null;
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

  getKeyboardDeviceSnapshot = (): boolean => this.hasKeyboardDevice;

  subscribeKeyboardDevice = (listener: Listener): (() => void) => {
    this.keyboardListeners.add(listener);
    return () => {
      this.keyboardListeners.delete(listener);
    };
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (looksLikeRealKeyboard(event)) {
      this.markKeyboardDevice();
    }

    for (const shortcut of this.shortcuts.values()) {
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

      if (shortcut.modified) {
        // AltGr reports as ctrlKey (+ altKey) on some layouts while typing an ordinary
        // character (e.g. ABNT2's Alt Gr+Q for "/") — excluding altKey keeps that from
        // firing a Ctrl-modified shortcut.
        if (!(event.ctrlKey || event.metaKey) || event.altKey) continue;
      } else {
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
    this.hasKeyboardDevice = false;
    delete document.documentElement.dataset.kbd;
    this.keyboardListeners.clear();
  }
}

export const shortcutRegistry = new ShortcutRegistry();

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

export function useShortcutHintsVisible(): boolean {
  const canHoverFine = useSyncExternalStore(subscribeHoverFine, getHoverFineSnapshot);
  const hasKeyboardDevice = useHasKeyboardDevice();
  return canHoverFine || hasKeyboardDevice;
}

export function formatShortcutKey(shortcut: Pick<Shortcut, 'key' | 'modified'>): string {
  const { key } = shortcut;
  const upperKey = key.length === 1 && /[a-z]/i.test(key) ? key.toUpperCase() : key;
  if (!shortcut.modified) return upperKey;
  const glyph = modifierGlyph();
  return glyph === '⌘' ? `${glyph}${upperKey}` : `${glyph}+${upperKey}`;
}

// Canonical form for the `aria-keyshortcuts` attribute — always "Control", never the
// platform-adaptive glyph `formatShortcutKey` uses for display (the registry itself accepts
// either Ctrl or Cmd at the handling level; aria-keyshortcuts is authored as one fixed string).
export function formatAriaKeyshortcuts(shortcut: Pick<Shortcut, 'key' | 'modified'>): string {
  return shortcut.modified ? `Control+${shortcut.key}` : shortcut.key;
}

export interface ShortcutHint {
  displayKey: string | undefined;
  visible: boolean;
  ariaKeyshortcuts: string | undefined;
}

export function useShortcutHint(id: string): ShortcutHint {
  const shortcut = useRegisteredShortcut(id);
  const hintsVisible = useShortcutHintsVisible();
  const visible = hintsVisible && !!shortcut;
  return {
    displayKey: shortcut ? formatShortcutKey(shortcut) : undefined,
    visible,
    ariaKeyshortcuts: shortcut ? formatAriaKeyshortcuts(shortcut) : undefined,
  };
}
