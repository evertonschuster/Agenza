import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute, LoginPage, AuthCallbackPage } from '@/features/auth';
import { CategoriesPage } from '@/features/categories';
import { AppLayout } from './AppLayout';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/callback', element: <AuthCallbackPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/categories', element: <CategoriesPage /> },
      { path: '*', element: <Navigate to="/categories" replace /> },
    ],
  },
]);
