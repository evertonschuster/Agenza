import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute, LoginPage, AuthCallbackPage } from '@/features/auth';
import { AppShell } from './shell/AppShell';
import type { RouteHandle } from './shell/RouteAnnouncer';
import { AppRouteError } from './AppRouteError';

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>;
}

function handle(title: string): { handle: RouteHandle } {
  return { handle: { title } };
}

export const router = createBrowserRouter([
  {
    errorElement: <AppRouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/callback', element: <AuthCallbackPage /> },
      {
        element: (
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Placeholder title="Início" />, ...handle('Início') },
          {
            path: 'agenda',
            element: <Placeholder title="Agenda" />,
            ...handle('Agenda'),
          },
          {
            path: 'clientes',
            element: <Placeholder title="Clientes" />,
            ...handle('Clientes'),
          },
          {
            path: 'conversas',
            element: <Placeholder title="Conversas" />,
            ...handle('Conversas'),
          },
          {
            path: 'servicos',
            element: <Placeholder title="Serviços" />,
            ...handle('Serviços'),
          },
          {
            path: 'ajustes',
            element: <Placeholder title="Ajustes" />,
            ...handle('Ajustes'),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
