import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { themeStore } from './themeStore';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    themeStore.reset();
  });

  it('reflects the store snapshot', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.choice).toBe('system');
    expect(result.current.resolved).toBe('light');
  });

  it('re-renders with the new snapshot after setTheme', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.choice).toBe('dark');
    expect(result.current.resolved).toBe('dark');
  });
});
