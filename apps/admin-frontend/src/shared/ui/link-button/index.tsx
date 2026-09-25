import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, type To } from 'react-router';
import type { VariantProps } from 'class-variance-authority';
import type { ShortcutHint } from '@/shared/keyboard/shortcuts';
import { buttonVariants } from '@/shared/ui/button';
import { ShortcutKbd } from '@/shared/ui/kbd';

interface LinkButtonProps extends VariantProps<typeof buttonVariants> {
  to: To;
  children: ReactNode;
  icon?: LucideIcon;
  hint?: ShortcutHint;
  className?: string;
}

function LinkButton({ to, children, icon: Icon, hint, variant, size, className }: LinkButtonProps) {
  return (
    <Link
      to={to}
      data-slot="link-button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({ variant, size, className })}
      aria-keyshortcuts={hint?.ariaKeyshortcuts}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
      <ShortcutKbd hint={hint} />
    </Link>
  );
}

export { LinkButton };
export type { LinkButtonProps };
