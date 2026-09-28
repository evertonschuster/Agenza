import type { Dialog as SheetPrimitive } from '@base-ui/react/dialog';

export type SheetSide = 'top' | 'right' | 'bottom' | 'left';

export type SheetContentProps = SheetPrimitive.Popup.Props & {
  side?: SheetSide;
  showCloseButton?: boolean;
};
