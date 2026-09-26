import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Button } from '@/shared/ui/button';

export type ActionButtonProps = ComponentProps<typeof Button> & {
  icon?: LucideIcon | undefined;
  pending?: boolean | undefined;
  shortcutId?: string | undefined;
};

export type ActionButtonWithShortcutProps = Omit<ActionButtonProps, 'shortcutId'> & {
  shortcutId: string;
};

export type ActionButtonBaseProps = Omit<ActionButtonProps, 'shortcutId'> & {
  keycap?: ReactNode;
};
