import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string | undefined;
  icon?: LucideIcon | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}

export type { EmptyStateProps };
