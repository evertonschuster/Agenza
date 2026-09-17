import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { DialogTrigger } from './components/dialog-trigger';
import { DialogPortal } from './components/dialog-portal';
import { DialogClose } from './components/dialog-close';
import { DialogOverlay } from './components/dialog-overlay';
import { DialogContent } from './components/dialog-content';
import { DialogHeader } from './components/dialog-header';
import { DialogFooter } from './components/dialog-footer';
import { DialogTitle } from './components/dialog-title';
import { DialogDescription } from './components/dialog-description';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
