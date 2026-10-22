import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router';
import { useSearchParamsState } from './useSearchParamsState';

interface Query {
  search: string;
  status: 'active' | 'inactive' | 'all';
  page: number;
  pageSize: number;
}

const DEFAULTS: Query = { search: '', status: 'active', page: 1, pageSize: 20 };

function renderAt(address: string) {
  function wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[address]}>{children}</MemoryRouter>;
  }

  return renderHook(
    () => {
      const [value, setValue] = useSearchParamsState(DEFAULTS);
      return {
        value,
        setValue,
        search: useLocation().search,
        navigationType: useNavigationType(),
        navigate: useNavigate(),
      };
    },
    { wrapper },
  );
}

describe('useSearchParamsState', () => {
  describe('reading', () => {
    it('starts from the defaults when the address carries nothing', () => {
      const { result } = renderAt('/pessoas');

      expect(result.current.value).toEqual(DEFAULTS);
    });

    it('reads each key from the address, and the default for each key it does not carry', () => {
      const { result } = renderAt('/pessoas?search=ana&page=3');

      expect(result.current.value).toEqual({ ...DEFAULTS, search: 'ana', page: 3 });
    });

    it('reads a number key as a number, and the default when it is not one or is empty', () => {
      const { result } = renderAt('/pessoas?page=abc&pageSize=');

      expect(result.current.value).toEqual(DEFAULTS);
    });

    it('takes a text key as the address writes it, without checking it against the type', () => {
      const { result } = renderAt('/pessoas?status=xyz');

      expect(result.current.value.status).toBe('xyz');
    });

    it('reads the address only once, when it mounts', () => {
      const { result } = renderAt('/pessoas?search=ana');

      act(() => {
        void result.current.navigate('/pessoas?search=bruno');
      });

      expect(result.current.search).toBe('?search=bruno');
      expect(result.current.value.search).toBe('ana');
    });
  });

  describe('writing', () => {
    it('hands back the new value and writes the keys that differ from the defaults', () => {
      const { result } = renderAt('/pessoas');

      act(() => result.current.setValue({ ...DEFAULTS, search: 'ana', status: 'all', page: 2 }));

      expect(result.current.value).toEqual({ ...DEFAULTS, search: 'ana', status: 'all', page: 2 });
      expect(result.current.search).toBe('?search=ana&status=all&page=2');
    });

    it('takes a key back out of the address when it returns to its default', () => {
      const { result } = renderAt('/pessoas?search=ana&page=3&pageSize=50');

      act(() => result.current.setValue({ ...DEFAULTS, pageSize: 50 }));

      expect(result.current.search).toBe('?pageSize=50');
    });

    it('leaves the keys it does not own as they were', () => {
      const { result } = renderAt('/pessoas?other=1&search=ana');

      act(() => result.current.setValue({ ...DEFAULTS, search: 'bruno' }));

      expect(result.current.search).toBe('?other=1&search=bruno');
    });

    it('replaces the history entry instead of adding one', () => {
      const { result } = renderAt('/pessoas');

      act(() => result.current.setValue({ ...DEFAULTS, page: 2 }));

      expect(result.current.navigationType).toBe('REPLACE');
    });
  });
});
