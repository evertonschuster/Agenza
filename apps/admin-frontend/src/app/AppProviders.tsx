import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth';
import { TooltipProvider } from '@/shared/ui/tooltip';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </AuthProvider>
  );
}
