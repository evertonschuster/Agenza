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

function ConfirmDialogUncertainView({ dismissLabel }: { dismissLabel: string }) {
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
          Não foi possível confirmar o resultado
        </DialogTitle>
        <DialogDescription>
          Verifique se a ação foi concluída antes de tentar novamente.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{dismissLabel}</DialogClose>
      </DialogFooter>
    </>
  );
}

export { ConfirmDialogUncertainView };
