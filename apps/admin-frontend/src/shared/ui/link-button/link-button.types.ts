import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { To } from 'react-router';
import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from '@/shared/ui/button';

export interface LinkButtonProps extends VariantProps<typeof buttonVariants> {
  to: To;
  children: ReactNode;
  icon?: LucideIcon;
  shortcutId?: string;
  className?: string;
}

export type LinkButtonWithShortcutProps = Omit<LinkButtonProps, 'shortcutId'> & {
  shortcutId: string;
};

export type LinkButtonBaseProps = Omit<LinkButtonProps, 'shortcutId'> & {
  keycap?: ReactNode;
  'aria-keyshortcuts'?: string | undefined;
};
