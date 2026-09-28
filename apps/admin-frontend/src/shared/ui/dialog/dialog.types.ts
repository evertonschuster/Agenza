import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type * as React from 'react';

export type DialogContentProps = DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
};

export type DialogFooterProps = React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
};
