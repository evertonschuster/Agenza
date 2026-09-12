import { describe, expect, it } from 'vitest';
import { resolveTheme, THEME_STORAGE_KEY } from './theme';

describe('resolveTheme', () => {
  it('resolves "light" to "light" regardless of the OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
  });

  it('resolves "dark" to "dark" regardless of the OS preference', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('resolves "system" to "dark" when the OS prefers dark', () => {
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('resolves "system" to "light" when the OS does not prefer dark', () => {
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('THEME_STORAGE_KEY', () => {
  it('matches the key identity-service/wwwroot/js/theme-init.js already reads (ADR 0040)', () => {
    expect(THEME_STORAGE_KEY).toBe('admin-theme');
  });
});
