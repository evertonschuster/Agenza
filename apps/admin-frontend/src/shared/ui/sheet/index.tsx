import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';

import { SheetTrigger } from './components/sheet-trigger';
import { SheetClose } from './components/sheet-close';
import { SheetContent } from './components/sheet-content';
import { SheetHeader } from './components/sheet-header';
import { SheetFooter } from './components/sheet-footer';
import { SheetTitle } from './components/sheet-title';
import { SheetDescription } from './components/sheet-description';

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
