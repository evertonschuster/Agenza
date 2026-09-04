import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute, LoginPage, AuthCallbackPage } from '@/features/auth';
import { AppLayout } from './AppLayout';
import { AppRouteError } from './AppRouteError';
import { HomePage } from './HomePage';

export const router = createBrowserRouter([
  {
    errorElement: <AppRouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/callback', element: <AuthCallbackPage /> },
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <HomePage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
