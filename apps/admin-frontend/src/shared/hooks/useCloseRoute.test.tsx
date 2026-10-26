import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { useCloseRoute } from './useCloseRoute';

function renderAt(entries: string[]) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        {children}
      </MemoryRouter>
    );
  }

  return renderHook(
    () => {
      const location = useLocation();
      return {
        close: useCloseRoute('/pessoas'),
        address: `${location.pathname}${location.search}`,
        navigationType: useNavigationType(),
      };
    },
    { wrapper },
  );
}

describe('useCloseRoute', () => {
  it('goes back to the page it came from, with that address and its query', () => {
    const { result } = renderAt(['/pessoas?status=all&page=2', '/pessoas/1/excluir']);

    act(() => result.current.close());

    expect(result.current.address).toBe('/pessoas?status=all&page=2');
    expect(result.current.navigationType).toBe('POP');
  });

  it('replaces the address with the fallback when the route was opened directly', () => {
    const { result } = renderAt(['/pessoas/1/excluir']);

    act(() => result.current.close());

    expect(result.current.address).toBe('/pessoas');
    expect(result.current.navigationType).toBe('REPLACE');
  });
});
