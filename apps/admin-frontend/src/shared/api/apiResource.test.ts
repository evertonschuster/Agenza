import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { fail, ok } from '@/shared/result';
import { NETWORK_PROBLEM, settle, useApiResource } from './apiResource';

const PROBLEM = { status: 404, code: 'Category.NotFound', title: 'não encontrada' };

describe('settle', () => {
  it('passes a success result through untouched', async () => {
    const result = ok([1, 2]);
    expect(await settle(Promise.resolve(result))).toBe(result);
  });

  it('passes a Problem failure through untouched', async () => {
    const result = fail(PROBLEM);
    expect(await settle(Promise.resolve(result))).toBe(result);
  });

  it('collapses any rejection — transport error or AbortError — into NETWORK_PROBLEM', async () => {
    expect(await settle(Promise.reject(new TypeError('Failed to fetch')))).toEqual(
      fail(NETWORK_PROBLEM),
    );
    expect(await settle(Promise.reject(new DOMException('aborted', 'AbortError')))).toEqual(
      fail(NETWORK_PROBLEM),
    );
  });
});

describe('useApiResource', () => {
  it('starts loading, then exposes the fetched data', async () => {
    const fetcher = () => Promise.resolve(ok(['a']));
    const { result } = renderHook(() => useApiResource(fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['a']);
    expect(result.current.problem).toBeNull();
  });

  it('surfaces a Problem failure and keeps data null', async () => {
    const fetcher = () => Promise.resolve(fail(PROBLEM));
    const { result } = renderHook(() => useApiResource(fetcher));

    await waitFor(() => expect(result.current.problem).toEqual(PROBLEM));
    expect(result.current.data).toBeNull();
  });

  it('reports NETWORK_PROBLEM when the request rejects', async () => {
    const fetcher = () => Promise.reject(new TypeError('offline'));
    const { result } = renderHook(() => useApiResource(fetcher));

    await waitFor(() => expect(result.current.problem).toEqual(NETWORK_PROBLEM));
  });

  it('aborts the in-flight request when the component unmounts', () => {
    let captured: AbortSignal | undefined;
    const { unmount } = renderHook(() =>
      useApiResource(
        (signal) =>
          new Promise<never>(() => {
            captured = signal;
          }),
      ),
    );

    expect(captured?.aborted).toBe(false);
    unmount();
    expect(captured?.aborted).toBe(true);
  });

  it('re-runs the fetcher on reload', async () => {
    const fetcher = vi.fn(() => Promise.resolve(ok(['x'])));
    const { result } = renderHook(() => useApiResource(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => result.current.reload());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
