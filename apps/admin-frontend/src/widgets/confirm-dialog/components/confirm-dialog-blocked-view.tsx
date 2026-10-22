import { AlertCircleIcon } from 'lucide-react';
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { ProblemCode } from '@/shared/ui/problem-code';
import type { ConfirmDialogBlockedViewProps } from '../confirm-dialog.types';

function ConfirmDialogBlockedView({
  blockedTitle,
  problem,
  dismissLabel,
}: ConfirmDialogBlockedViewProps) {
  return (
    <>
      <DialogHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircleIcon aria-hidden="true" className="size-5" />
        </div>
        <DialogTitle>{blockedTitle}</DialogTitle>
        <DialogDescription>{problem.title}</DialogDescription>
        <ProblemCode code={problem.code} />
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{dismissLabel}</DialogClose>
      </DialogFooter>
    </>
  );
}

export { ConfirmDialogBlockedView };
