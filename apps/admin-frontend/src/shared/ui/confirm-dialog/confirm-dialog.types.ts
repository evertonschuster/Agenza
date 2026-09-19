import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ApiResult } from '../../api/servicesFacade';

interface ConfirmDialogFailure {
  message: string;
  transient: boolean;
}

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
  description?: string;
}

interface ConfirmDialogProps<T> {
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<ApiResult<T>>;
  onSuccess?: (data: T) => void;
  confirmation: ConfirmDialogConfirmation;
  error?: ConfirmDialogError;
  success?: ConfirmDialogSuccess;
}

interface ConfirmDialogBlockedViewProps {
  blockedTitle: string;
  message: string;
  dismissLabel: string;
  onDismiss: () => void;
}

interface ConfirmDialogConfirmViewProps {
  title: string;
  description: ReactNode;
  ConfirmIcon: LucideIcon;
  confirmLabel: string;
  cancelLabel: string;
  retryLabel: string;
  failure: ConfirmDialogFailure | undefined;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export type {
  ConfirmDialogProps,
  ConfirmDialogFailure,
  ConfirmDialogBlockedViewProps,
  ConfirmDialogConfirmViewProps,
};
