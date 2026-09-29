import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export type ActionButtonProps = ComponentProps<typeof Button> & {
  icon?: LucideIcon | undefined;
  pending?: boolean | undefined;
};

function ActionButton({
  icon: Icon,
  pending = false,
  disabled,
  children,
  ...buttonProps
}: ActionButtonProps) {
  return (
    <Button {...buttonProps} disabled={disabled || pending} focusableWhenDisabled={pending}>
      {pending ? (
        <Loader2Icon aria-hidden="true" className="animate-spin" />
      ) : (
        Icon && <Icon aria-hidden="true" />
      )}
      {children}
    </Button>
  );
}

export { ActionButton };
