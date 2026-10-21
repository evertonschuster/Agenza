import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { advanceSeconds } from '@/test/advanceSeconds';
import { useCooldown } from './useCooldown';

describe('useCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with nothing to wait for', () => {
    const { result } = renderHook(() => useCooldown());

    expect(result.current[0]).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('counts down one second at a time and stops at zero', async () => {
    const { result } = renderHook(() => useCooldown());

    act(() => {
      result.current[1](3);
    });
    expect(result.current[0]).toBe(3);

    await advanceSeconds(1);
    expect(result.current[0]).toBe(2);

    await advanceSeconds(2);
    expect(result.current[0]).toBe(0);

    await advanceSeconds(5);
    expect(result.current[0]).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts from the new value when started again mid-count', async () => {
    const { result } = renderHook(() => useCooldown());
    act(() => {
      result.current[1](5);
    });
    await advanceSeconds(3);
    expect(result.current[0]).toBe(2);

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
  });

  it('stops when started with zero', () => {
    const { result } = renderHook(() => useCooldown());
    act(() => {
      result.current[1](4);
    });

    act(() => {
      result.current[1](0);
    });

    expect(result.current[0]).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no timer behind once unmounted', () => {
    const { result, unmount } = renderHook(() => useCooldown());
    act(() => {
      result.current[1](4);
    });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
