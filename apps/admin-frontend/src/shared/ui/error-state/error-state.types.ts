import type { LucideIcon } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  description?: string | undefined;
  code?: string | undefined;
  icon?: LucideIcon | undefined;
  retryLabel?: string | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}

export type { ErrorStateProps };
