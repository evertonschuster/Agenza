import { useEffect, useRef, useState } from 'react';
import { isTransientProblem, type ApiProblem } from '@/shared/api/servicesFacade';
import { logger } from '@/shared/logger';
import { toast } from '@/shared/ui/toast';
import type { ConfirmDialogProps } from './confirm-dialog.types';

type ConfirmDialogOptions<T> = Pick<ConfirmDialogProps<T>, 'onConfirm' | 'onOpenChange'> & {
  onSuccess: ConfirmDialogProps<T>['onSuccess'];
  successTitle: string;
  successDescription: string | undefined;
};

function notify(notification: Parameters<typeof toast.add>[0], errorEvent: string) {
  try {
    toast.add(notification);
  } catch {
    logger.error(errorEvent);
  }
}

function useConfirmDialog<T>({
  onConfirm,
  onOpenChange,
  onSuccess,
  successTitle,
  successDescription,
}: ConfirmDialogOptions<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [problem, setProblem] = useState<ApiProblem>();
  const [blockedRetries, setBlockedRetries] = useState(0);
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const isBlocked = problem !== undefined && !isTransientProblem(problem);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleConfirm() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (!isBlocked) setProblem(undefined);
    setIsSubmitting(true);
    const result = await onConfirm();
    isSubmittingRef.current = false;
    if (isMountedRef.current) setIsSubmitting(false);

    if (result.ok) {
      notify(
        { title: successTitle, description: successDescription, type: 'success' },
        'confirm_dialog.success_notification_failed',
      );
      if (isMountedRef.current) {
        try {
          onSuccess?.(result.data);
        } catch {
          logger.error('confirm_dialog.success_callback_failed');
          notify(
            {
              title: 'Ação concluída',
              description: 'Não foi possível atualizar a tela. Atualize a página.',
              type: 'error',
            },
            'confirm_dialog.success_notification_failed',
          );
        }
        onOpenChange(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setProblem(result.error);
      if (isBlocked && !isTransientProblem(result.error)) {
        setBlockedRetries((count) => count + 1);
      }
    }
  }

  return { isSubmitting, problem, isBlocked, blockedRetries, handleConfirm };
}

export { useConfirmDialog };
