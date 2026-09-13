import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from './theme';
import { themeStore } from './themeStore';

type ChangeListener = (event: { matches: boolean }) => void;

function makeFakeMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<ChangeListener>();
  return {
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, cb: ChangeListener) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: ChangeListener) => {
      listeners.delete(cb);
    },
    set(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
  };
}

describe('themeStore', () => {
  let media: ReturnType<typeof makeFakeMedia>;

  beforeEach(() => {
    localStorage.clear();
    media = makeFakeMedia(false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media as unknown as MediaQueryList),
    );
    themeStore.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the OS preference when nothing is stored', () => {
    expect(themeStore.getSnapshot()).toEqual({ choice: 'system', resolved: 'light' });
  });

  it('reads a previously stored choice back on reset (persistence across reload)', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    themeStore.reset();

    expect(themeStore.getSnapshot()).toEqual({ choice: 'dark', resolved: 'dark' });
  });

  it('applies the resolved theme to <html>, color-scheme and the theme-color meta', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);

    themeStore.setChoice('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(meta.getAttribute('content')).toBe('#111318');

    meta.remove();
  });

  it('persists a choice to localStorage and notifies subscribers', () => {
    const listener = vi.fn();
    themeStore.subscribe(listener);

    themeStore.setChoice('dark');

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(themeStore.getSnapshot().resolved).toBe('dark');
  });

  it('stops notifying once a subscriber unsubscribes', () => {
    const listener = vi.fn();
    const unsubscribe = themeStore.subscribe(listener);
    unsubscribe();

    themeStore.setChoice('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('follows an OS preference change while the choice is "system"', () => {
    themeStore.setChoice('system');
    const listener = vi.fn();
    themeStore.subscribe(listener);

    media.set(true);

    expect(themeStore.getSnapshot().resolved).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores an OS preference change while an explicit choice is set', () => {
    themeStore.setChoice('light');
    const listener = vi.fn();
    themeStore.subscribe(listener);

    media.set(true);

    expect(themeStore.getSnapshot().resolved).toBe('light');
    expect(listener).not.toHaveBeenCalled();
  });
});
