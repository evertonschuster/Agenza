import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { LinkButtonBaseProps } from '../link-button.types';

function LinkButtonBase({
  to,
  children,
  icon: Icon,
  variant,
  size,
  className,
  keycap,
  'aria-keyshortcuts': ariaKeyshortcuts,
}: LinkButtonBaseProps) {
  return (
    <Link
      to={to}
      data-slot="link-button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({ variant, size, className })}
      aria-keyshortcuts={ariaKeyshortcuts}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
      {keycap}
    </Link>
  );
}

export { LinkButtonBase };
