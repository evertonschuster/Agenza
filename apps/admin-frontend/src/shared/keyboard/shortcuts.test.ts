import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatAriaKeyshortcuts, formatShortcutKey, shortcutRegistry } from './shortcuts';

vi.mock('./platform', () => ({
  modifierGlyph: () => 'Ctrl' as const,
}));

function dispatchKeydown(
  target: EventTarget,
  key: string,
  init?: Partial<KeyboardEventInit>,
): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
}

describe('shortcutRegistry', () => {
  afterEach(() => {
    // Clear before reset — reset() re-reads the enabled flag from storage, so a leftover
    // 'false' from the disabled-preference test would otherwise leak into the next test.
    localStorage.clear();
    shortcutRegistry.reset();
    document.body.innerHTML = '';
  });

  it('matches event.key case-insensitively for a single-character shortcut', () => {
    const handler = vi.fn();
    shortcutRegistry.register({ id: 'lower', key: 'n', description: 'Novo', handler });

    dispatchKeydown(document, 'N');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('suppresses an unmodified shortcut while the target is a typing target', () => {
    const handler = vi.fn();
    shortcutRegistry.register({ id: 'typing', key: 'n', description: 'Novo', handler });
    const input = document.createElement('input');
    document.body.appendChild(input);

    dispatchKeydown(input, 'n');

    expect(handler).not.toHaveBeenCalled();
  });

  it('suppresses an unmodified shortcut once the preference is disabled, but still fires modified shortcuts', () => {
    const plainHandler = vi.fn();
    const modifiedHandler = vi.fn();
    shortcutRegistry.register({
      id: 'plain',
      key: 'n',
      description: 'Novo',
      handler: plainHandler,
    });
    shortcutRegistry.register({
      id: 'modified',
      key: 'k',
      description: 'Palette',
      handler: modifiedHandler,
      modified: true,
    });

    shortcutRegistry.setEnabled(false);
    dispatchKeydown(document, 'n');
    dispatchKeydown(document, 'k', { ctrlKey: true });

    expect(plainHandler).not.toHaveBeenCalled();
    expect(modifiedHandler).toHaveBeenCalledTimes(1);
  });

  it('suppresses an unmodified shortcut while a dialog is open, but resumes once it closes', () => {
    const handler = vi.fn();
    shortcutRegistry.register({ id: 'help', key: '?', description: 'Ajuda', handler });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-open', '');
    document.body.appendChild(dialog);

    dispatchKeydown(document, '?');
    expect(handler).not.toHaveBeenCalled();

    dialog.removeAttribute('data-open');
    dispatchKeydown(document, '?');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not suppress a modified shortcut while a dialog is open', () => {
    const handler = vi.fn();
    shortcutRegistry.register({
      id: 'palette',
      key: 'k',
      description: 'Palette',
      handler,
      modified: true,
    });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-open', '');
    document.body.appendChild(dialog);

    dispatchKeydown(document, 'k', { ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  describe('keyboard-device detection', () => {
    it('does not mark a keyboard device for a plain character typed into a field', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      dispatchKeydown(input, 'a');

      expect(shortcutRegistry.getKeyboardDeviceSnapshot()).toBe(false);
    });

    it('marks a keyboard device for Tab even while typing into a field', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      dispatchKeydown(input, 'Tab');

      expect(shortcutRegistry.getKeyboardDeviceSnapshot()).toBe(true);
    });

    it('marks a keyboard device for a modified key even while typing into a field', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      dispatchKeydown(input, 'k', { ctrlKey: true });

      expect(shortcutRegistry.getKeyboardDeviceSnapshot()).toBe(true);
    });

    it('marks a keyboard device for a plain character when nothing is focused', () => {
      dispatchKeydown(document, 'a');

      expect(shortcutRegistry.getKeyboardDeviceSnapshot()).toBe(true);
    });
  });

  describe('formatShortcutKey', () => {
    it('upper-cases a single letter with no modifier', () => {
      expect(formatShortcutKey({ key: 'n', modified: false })).toBe('N');
    });

    it('prefixes a modified letter with the platform glyph', () => {
      expect(formatShortcutKey({ key: 'k', modified: true })).toBe('Ctrl+K');
    });

    it('leaves a non-letter key as-is when unmodified', () => {
      expect(formatShortcutKey({ key: '?', modified: false })).toBe('?');
    });
  });

  describe('formatAriaKeyshortcuts', () => {
    it('returns the bare key when unmodified', () => {
      expect(formatAriaKeyshortcuts({ key: 'n', modified: false })).toBe('N');
    });

    it('lists both cross-platform modifier tokens when modified', () => {
      expect(formatAriaKeyshortcuts({ key: 'k', modified: true })).toBe('Control+K Meta+K');
    });
  });
});
