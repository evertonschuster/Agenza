import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportKind } from './useViewportKind';

type ChangeListener = (event: { matches: boolean }) => void;

function makeFakeMedia(query: string, initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<ChangeListener>();
  return {
    query,
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

describe('useViewportKind', () => {
  let rail: ReturnType<typeof makeFakeMedia>;
  let sidebar: ReturnType<typeof makeFakeMedia>;

  function stub() {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        (query: string) => (query.includes('1024') ? sidebar : rail) as unknown as MediaQueryList,
      ),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports "bottom" when neither breakpoint matches', () => {
    rail = makeFakeMedia('(min-width: 768px)', false);
    sidebar = makeFakeMedia('(min-width: 1024px)', false);
    stub();

    const { result } = renderHook(() => useViewportKind());

    expect(result.current).toBe('bottom');
  });

  it('reports "rail" when only the 768px breakpoint matches', () => {
    rail = makeFakeMedia('(min-width: 768px)', true);
    sidebar = makeFakeMedia('(min-width: 1024px)', false);
    stub();

    const { result } = renderHook(() => useViewportKind());

    expect(result.current).toBe('rail');
  });

  it('reports "sidebar" when the 1024px breakpoint matches', () => {
    rail = makeFakeMedia('(min-width: 768px)', true);
    sidebar = makeFakeMedia('(min-width: 1024px)', true);
    stub();

    const { result } = renderHook(() => useViewportKind());

    expect(result.current).toBe('sidebar');
  });

  it('re-renders when the viewport crosses a breakpoint', () => {
    rail = makeFakeMedia('(min-width: 768px)', false);
    sidebar = makeFakeMedia('(min-width: 1024px)', false);
    stub();

    const { result } = renderHook(() => useViewportKind());
    expect(result.current).toBe('bottom');

    act(() => rail.set(true));

    expect(result.current).toBe('rail');
  });
});
