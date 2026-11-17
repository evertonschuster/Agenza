import { AlertCircleIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { ActionButton } from '@/shared/ui/action-button';
import { ProblemCode } from '@/shared/ui/problem-code';
import { RelatedRecords } from '@/shared/ui/related-records';
import type { ConfirmDialogBlockedViewProps } from '../confirm-dialog.types';

function ConfirmDialogBlockedView({
  blockedTitle,
  problem,
  dismissLabel,
  retryLabel,
  isSubmitting,
  onRetry,
}: ConfirmDialogBlockedViewProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <>
      <DialogHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircleIcon aria-hidden="true" className="size-5" />
        </div>
        <DialogTitle ref={titleRef} tabIndex={-1}>
          {blockedTitle}
        </DialogTitle>
        <DialogDescription aria-live="polite">{problem.title}</DialogDescription>
        <ProblemCode code={problem.code} />
      </DialogHeader>
      <RelatedRecords problem={problem} />
      <DialogFooter>
        <DialogClose disabled={isSubmitting} render={<Button variant="outline" />}>
          {dismissLabel}
        </DialogClose>
        {retryLabel && (
          <ActionButton variant="destructive" pending={isSubmitting} onClick={onRetry}>
            {retryLabel}
          </ActionButton>
        )}
      </DialogFooter>
    </>
  );
}

export { ConfirmDialogBlockedView };
