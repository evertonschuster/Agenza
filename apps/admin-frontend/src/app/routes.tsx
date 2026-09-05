import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute, LoginPage, AuthCallbackPage } from '@/features/auth';
import { AppShell } from './shell/AppShell';
import type { RouteHandle } from './shell/RouteAnnouncer';
import { AppRouteError } from './AppRouteError';
import { Agenda } from './pages/Agenda';
import { Ajustes } from './pages/Ajustes';
import { Clientes } from './pages/Clientes';
import { Conversas } from './pages/Conversas';
import { Inicio } from './pages/Inicio';
import { Servicos } from './pages/Servicos';

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
          { index: true, element: <Inicio />, ...handle('Início') },
          { path: 'agenda', element: <Agenda />, ...handle('Agenda') },
          { path: 'clientes', element: <Clientes />, ...handle('Clientes') },
          { path: 'conversas', element: <Conversas />, ...handle('Conversas') },
          { path: 'servicos', element: <Servicos />, ...handle('Serviços') },
          { path: 'ajustes', element: <Ajustes />, ...handle('Ajustes') },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
