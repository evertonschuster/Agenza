import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth';
import { Toaster } from '@/shared/ui/toast';
import { TooltipProvider } from '@/shared/ui/tooltip';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster>{children}</Toaster>
      </TooltipProvider>
    </AuthProvider>
  );
}
