import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';

interface ConfirmDialogConfirmation {
  title?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmDialogError {
  blockedTitle?: string;
  retryLabel?: string;
  dismissLabel?: string;
}

interface ConfirmDialogSuccess {
  title?: string;
  description?: string | undefined;
}

interface ConfirmDialogProps<T> {
  loading?: boolean | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<ApiResult<T>>;
  onSuccess?: (data: T) => void;
  confirmation: ConfirmDialogConfirmation;
  error?: ConfirmDialogError;
  success?: ConfirmDialogSuccess;
}

interface ConfirmDialogBlockedViewProps {
  blockedTitle: string;
  problem: ApiProblem;
  dismissLabel: string;
}

interface ConfirmDialogConfirmViewProps {
  title: string;
  description: ReactNode;
  ConfirmIcon: LucideIcon;
  confirmLabel: string;
  cancelLabel: string;
  retryLabel: string;
  failure: ApiProblem | undefined;
  loading: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export type { ConfirmDialogProps, ConfirmDialogBlockedViewProps, ConfirmDialogConfirmViewProps };
