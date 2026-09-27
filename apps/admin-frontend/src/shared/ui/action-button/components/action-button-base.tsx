import { Loader2Icon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { ActionButtonBaseProps } from '../action-button.types';

function ActionButtonBase({
  icon: Icon,
  pending = false,
  disabled,
  children,
  keycap,
  ...buttonProps
}: ActionButtonBaseProps) {
  return (
    <Button {...buttonProps} disabled={disabled || pending}>
      {pending ? (
        <Loader2Icon aria-hidden="true" className="animate-spin" />
      ) : (
        Icon && <Icon aria-hidden="true" />
      )}
      {children}
      {keycap}
    </Button>
  );
}

export { ActionButtonBase };
