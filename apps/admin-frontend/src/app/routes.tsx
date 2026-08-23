import { Route, Routes } from 'react-router';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { SignInRedirect } from '@/features/auth/components/SignInRedirect';
import { LoginRedirect } from '@/features/auth/components/LoginRedirect';
import { AppLayout } from './AppLayout';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<SignInRedirect />} />
      <Route path="/callback" element={<LoginRedirect />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
