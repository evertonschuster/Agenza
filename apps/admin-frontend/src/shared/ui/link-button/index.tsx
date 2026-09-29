import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { To } from 'react-router';
import { Link } from 'react-router';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/shared/ui/button';

export interface LinkButtonProps extends VariantProps<typeof buttonVariants> {
  to: To;
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

function LinkButton({ to, children, icon: Icon, variant, size, className }: LinkButtonProps) {
  return (
    <Link
      to={to}
      data-slot="link-button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({ variant, size, className })}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </Link>
  );
}

export { LinkButton };
