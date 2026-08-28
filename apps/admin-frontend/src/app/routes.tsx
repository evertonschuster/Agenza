import { Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute, LoginPage, AuthCallbackPage } from '@/features/auth';
import { CategoriesPage } from '@/features/categories';
import { AppLayout } from './AppLayout';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<AuthCallbackPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="*" element={<Navigate to="/categories" replace />} />
      </Route>
    </Routes>
  );
}
