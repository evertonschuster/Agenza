import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage, AuthCallbackPage } from '@/features/auth';
import type { RouteHandle } from './shell/RouteAnnouncer';
import { AppRouteError } from './AppRouteError';

function handle(title: string): { handle: RouteHandle } {
  return { handle: { title } };
}

// Shown only while a lazy route's chunk is still in flight on first load — the six
// destinations are sub-kB and this app never server-renders, so on any real connection this
// never becomes visible. On a throttled one it replaces a blank tab with a themed, non-jarring
// placeholder (react-router warns without one: "No HydrateFallback element provided").
function RouteHydrateFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      Carregando…
    </div>
  );
}

export const router = createBrowserRouter([
  {
    errorElement: <AppRouteError />,
    HydrateFallback: RouteHydrateFallback,
    children: [
      // Not lazy: LoginPage/AuthCallbackPage share @/features/auth's barrel with useAuth,
      // already imported eagerly by AppProviders/AppHeader/CommandPalette/ProtectedAppShell —
      // a dynamic import here can't isolate them into their own chunk (confirmed by Rollup's
      // own INEFFECTIVE_DYNAMIC_IMPORT warning when this was tried), so lazy would just add
      // indirection for zero byte savings.
      { path: '/login', element: <LoginPage /> },
      { path: '/callback', element: <AuthCallbackPage /> },
      {
        lazy: () =>
          import('./shell/ProtectedAppShell').then((m) => ({ Component: m.ProtectedAppShell })),
        children: [
          {
            index: true,
            ...handle('Início'),
            lazy: () => import('./pages/Home').then((m) => ({ Component: m.Home })),
          },
          {
            path: 'agenda',
            ...handle('Agenda'),
            lazy: () => import('./pages/Schedule').then((m) => ({ Component: m.Schedule })),
          },
          {
            path: 'clientes',
            ...handle('Clientes'),
            lazy: () => import('./pages/Clients').then((m) => ({ Component: m.Clients })),
          },
          {
            path: 'conversas',
            ...handle('Conversas'),
            lazy: () =>
              import('./pages/Conversations').then((m) => ({ Component: m.Conversations })),
          },
          {
            path: 'servicos',
            ...handle('Serviços'),
            lazy: () => import('./pages/Services').then((m) => ({ Component: m.Services })),
          },
          {
            path: 'ajustes',
            ...handle('Ajustes'),
            lazy: () => import('./pages/Settings').then((m) => ({ Component: m.Settings })),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
