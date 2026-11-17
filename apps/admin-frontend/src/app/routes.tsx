import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage, AuthCallbackPage } from '@/features/auth';
import { EDIT_RECORD_ROUTE } from '@/shared/routes/editRecordPath';
import { SERVICES_PATH } from '@/shared/routes/servicePaths';
import type { PageCrumbHandle } from '@/widgets/page-header';
import { AppRouteError } from './AppRouteError';
import { RouteHydrateFallback } from './RouteHydrateFallback';

function crumb(label: string, options: Omit<PageCrumbHandle, 'crumb'> = {}): PageCrumbHandle {
  return { crumb: label, ...options };
}

export const router = createBrowserRouter([
  {
    errorElement: <AppRouteError />,
    HydrateFallback: RouteHydrateFallback,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/callback', element: <AuthCallbackPage /> },
      {
        handle: crumb('Início', { hideInTrail: true }),
        lazy: () =>
          import('./shell/ProtectedAppShell').then((m) => ({ Component: m.ProtectedAppShell })),
        children: [
          {
            index: true,
            lazy: () => import('./pages/Home').then((m) => ({ Component: m.Home })),
          },
          {
            path: 'agenda',
            handle: crumb('Agenda'),
            lazy: () => import('./pages/Schedule').then((m) => ({ Component: m.Schedule })),
          },
          {
            path: 'pessoas',
            handle: crumb('Pessoas'),
            children: [
              {
                lazy: () =>
                  import('@/features/clients').then((m) => ({ Component: m.ClientListPage })),
                children: [
                  { index: true, element: null },
                  {
                    path: ':id/excluir',
                    lazy: () =>
                      import('@/features/clients').then((m) => ({
                        Component: m.ClientDeletePage,
                      })),
                  },
                ],
              },
              {
                path: 'nova',
                handle: crumb('Nova pessoa'),
                lazy: () =>
                  import('@/features/clients').then((m) => ({ Component: m.ClientFormPage })),
              },
              {
                path: EDIT_RECORD_ROUTE,
                handle: crumb('Editar pessoa'),
                lazy: () =>
                  import('@/features/clients').then((m) => ({ Component: m.ClientFormPage })),
              },
              {
                path: ':id',
                handle: crumb('Detalhes da pessoa'),
                lazy: () =>
                  import('./pages/ClientDetails').then((m) => ({ Component: m.ClientDetails })),
              },
            ],
          },
          {
            path: 'conversas',
            handle: crumb('Conversas'),
            lazy: () =>
              import('./pages/Conversations').then((m) => ({ Component: m.Conversations })),
          },
          {
            path: SERVICES_PATH,
            handle: crumb('Serviços'),
            children: [
              {
                index: true,
                lazy: () => import('./pages/Services').then((m) => ({ Component: m.Services })),
              },
              {
                path: EDIT_RECORD_ROUTE,
                handle: crumb('Editar serviço'),
                lazy: () =>
                  import('./pages/ServiceEdit').then((m) => ({ Component: m.ServiceEdit })),
              },
            ],
          },
          {
            path: 'tags',
            handle: crumb('Etiquetas'),
            lazy: () => import('@/features/tags').then((m) => ({ Component: m.TagListPage })),
            children: [
              {
                path: 'new',
                lazy: () => import('@/features/tags').then((m) => ({ Component: m.TagFormPage })),
              },
              {
                path: ':id/edit',
                lazy: () => import('@/features/tags').then((m) => ({ Component: m.TagFormPage })),
              },
              {
                path: ':id/delete',
                lazy: () => import('@/features/tags').then((m) => ({ Component: m.TagDeletePage })),
              },
            ],
          },
          {
            path: 'ajustes',
            handle: crumb('Ajustes'),
            lazy: () => import('./pages/Settings').then((m) => ({ Component: m.Settings })),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
