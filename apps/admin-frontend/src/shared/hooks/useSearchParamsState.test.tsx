import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router';
import { useSearchParamsState } from './useSearchParamsState';

interface Query {
  search: string;
  status: 'active' | 'inactive' | 'all';
  page: number;
  pageSize: number;
  archived: boolean;
}

const DEFAULTS: Query = { search: '', status: 'active', page: 1, pageSize: 20, archived: false };

function renderAt(address: string) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[address]}>
        <Routes>
          <Route path="pessoas" element={children}>
            <Route index element={null} />
            <Route path=":id/excluir" element={null} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  return renderHook(
    () => {
      const [value, setValue] = useSearchParamsState(DEFAULTS);
      return {
        value,
        setValue,
        search: useLocation().search,
        pathname: useLocation().pathname,
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

    it('reads a boolean key from true or false, and the default for anything else', () => {
      expect(renderAt('/pessoas?archived=true').result.current.value.archived).toBe(true);
      expect(renderAt('/pessoas?archived=sim').result.current.value.archived).toBe(false);
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
    it('keeps a correction off the child route and writes it on returning to the list', () => {
      const { result } = renderAt('/pessoas?other=1&search=ana&status=all&page=2');

      act(() => {
        void result.current.navigate('/pessoas/1/excluir');
      });
      act(() => result.current.setValue({ ...DEFAULTS, search: 'ana', status: 'all' }));

      expect(result.current.pathname).toBe('/pessoas/1/excluir');
      expect(result.current.search).toBe('');
      expect(result.current.value.page).toBe(1);

      act(() => {
        void result.current.navigate(-1);
      });

      expect(result.current.pathname).toBe('/pessoas');
      expect(result.current.search).toBe('?other=1&search=ana&status=all');
      expect(result.current.navigationType).toBe('REPLACE');
    });

    it('writes a correction on the parent when the child was opened directly', () => {
      const { result } = renderAt('/pessoas/1/excluir?status=all&page=2');

      act(() => result.current.setValue({ ...DEFAULTS, status: 'all' }));

      expect(result.current.search).toBe('?status=all&page=2');

      act(() => {
        void result.current.navigate('/pessoas', { replace: true });
      });

      expect(result.current.pathname).toBe('/pessoas');
      expect(result.current.search).toBe('?status=all');
    });

    it('hands back the new value and writes the keys that differ from the defaults', () => {
      const { result } = renderAt('/pessoas');

      act(() => result.current.setValue({ ...DEFAULTS, search: 'ana', status: 'all', page: 2 }));

      expect(result.current.value).toEqual({ ...DEFAULTS, search: 'ana', status: 'all', page: 2 });
      expect(result.current.search).toBe('?search=ana&status=all&page=2');
    });

    it('writes a boolean key as true or false', () => {
      const { result } = renderAt('/pessoas');

      act(() => result.current.setValue({ ...DEFAULTS, archived: true }));

      expect(result.current.search).toBe('?archived=true');
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
