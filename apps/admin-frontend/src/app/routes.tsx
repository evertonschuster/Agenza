import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage, AuthCallbackPage } from '@/features/auth';
import { AppRouteError } from './AppRouteError';
import { RouteHydrateFallback } from './RouteHydrateFallback';

export const router = createBrowserRouter([
  {
    errorElement: <AppRouteError />,
    HydrateFallback: RouteHydrateFallback,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/callback', element: <AuthCallbackPage /> },
      {
        lazy: () =>
          import('./shell/ProtectedAppShell').then((m) => ({ Component: m.ProtectedAppShell })),
        children: [
          {
            index: true,
            lazy: () => import('./pages/Home').then((m) => ({ Component: m.Home })),
          },
          {
            path: 'agenda',
            lazy: () => import('./pages/Schedule').then((m) => ({ Component: m.Schedule })),
          },
          {
            path: 'clientes',
            lazy: () => import('./pages/Clients').then((m) => ({ Component: m.Clients })),
          },
          {
            path: 'conversas',
            lazy: () =>
              import('./pages/Conversations').then((m) => ({ Component: m.Conversations })),
          },
          {
            path: 'servicos',
            lazy: () => import('./pages/Services').then((m) => ({ Component: m.Services })),
          },
          {
            path: 'tags',
            lazy: () =>
              import('@/features/tags').then((m) => ({
                Component: m.TagListPage,
                loader: m.tagListLoader,
              })),
          },
          {
            path: 'ajustes',
            lazy: () => import('./pages/Settings').then((m) => ({ Component: m.Settings })),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
