import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import {
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './components/dialog-primitives';
import { DialogContent } from './components/dialog-content';
import { DialogFooter } from './components/dialog-footer';

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
