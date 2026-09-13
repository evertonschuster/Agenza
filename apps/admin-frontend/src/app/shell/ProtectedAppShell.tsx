import { ProtectedRoute } from '@/features/auth';
import { AppShell } from './AppShell';

export function ProtectedAppShell() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}
