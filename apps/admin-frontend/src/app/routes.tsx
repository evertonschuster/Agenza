import { Route, Routes } from 'react-router';
import { ProtectedRoute, SignInRedirect, LoginRedirect } from '@/features/auth';
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
