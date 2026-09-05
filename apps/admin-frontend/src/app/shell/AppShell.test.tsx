import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthContext, type AuthContextValue } from '@/features/auth';
import { INITIAL_SESSION } from '@/shared/session/session';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { AppShell } from './AppShell';

function makeFakeMedia(initialMatches: boolean) {
  let matches = initialMatches;
  return {
    get matches() {
      return matches;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    set(next: boolean) {
      matches = next;
    },
  };
}

function stubViewport(kind: 'bottom' | 'rail' | 'sidebar') {
  const rail = makeFakeMedia(kind !== 'bottom');
  const sidebar = makeFakeMedia(kind === 'sidebar');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(
      (query: string) => (query.includes('1024') ? sidebar : rail) as unknown as MediaQueryList,
    ),
  );
}

function renderShell() {
  const value: AuthContextValue = {
    session: { ...INITIAL_SESSION, status: 'authenticated', accessToken: 'token' },
    tenant: { tenantId: '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120' },
    user: { displayName: 'Demo Owner', email: 'owner@demo.local' },
    login: vi.fn(),
    logout: vi.fn(),
  };

  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [{ path: 'inner', element: <div>routed content</div> }],
      },
    ],
    { initialEntries: ['/inner'] },
  );

  return render(
    <AuthContext.Provider value={value}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthContext.Provider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    stubViewport('sidebar');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the header, the routed page and a skip link', () => {
    renderShell();

    expect(screen.getByText('routed content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('shows the sidebar and no bottom bar at desktop width', () => {
    stubViewport('sidebar');
    renderShell();

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mais' })).not.toBeInTheDocument();
  });

  it('shows the bottom bar and no sidebar at phone width', () => {
    stubViewport('bottom');
    renderShell();

    expect(screen.getByRole('button', { name: 'Mais' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Conversas/ })).not.toBeInTheDocument();
  });
});
