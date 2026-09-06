import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute, LoginPage, AuthCallbackPage } from '@/features/auth';
import { AppShell } from './shell/AppShell';
import type { RouteHandle } from './shell/RouteAnnouncer';
import { AppRouteError } from './AppRouteError';
import { Schedule } from './pages/Schedule';
import { Settings } from './pages/Settings';
import { Clients } from './pages/Clients';
import { Conversations } from './pages/Conversations';
import { Home } from './pages/Home';
import { Services } from './pages/Services';

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
          { index: true, element: <Home />, ...handle('Início') },
          { path: 'agenda', element: <Schedule />, ...handle('Agenda') },
          { path: 'clientes', element: <Clients />, ...handle('Clientes') },
          { path: 'conversas', element: <Conversations />, ...handle('Conversas') },
          { path: 'servicos', element: <Services />, ...handle('Serviços') },
          { path: 'ajustes', element: <Settings />, ...handle('Ajustes') },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
