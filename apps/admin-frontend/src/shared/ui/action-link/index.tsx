import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';

type ButtonStyle = NonNullable<Parameters<typeof buttonVariants>[0]>;

export type ActionLinkProps = ComponentProps<typeof Link> & {
  icon?: LucideIcon | undefined;
  variant?: ButtonStyle['variant'];
  size?: ButtonStyle['size'];
};

function ActionLink({
  icon: Icon,
  variant = 'default',
  size = 'default',
  className,
  children,
  ...linkProps
}: ActionLinkProps) {
  return (
    <Link
      {...linkProps}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({ variant, size, className })}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </Link>
  );
}

export { ActionLink };
