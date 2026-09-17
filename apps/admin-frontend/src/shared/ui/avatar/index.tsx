import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn } from '@/shared/lib/utils';
import type { AvatarSize } from './avatar.types';

import { AvatarImage } from './components/avatar-image';
import { AvatarFallback } from './components/avatar-fallback';
import { AvatarGroup } from './components/avatar-group';
import { AvatarGroupCount } from './components/avatar-group-count';
import { AvatarBadge } from './components/avatar-badge';

function Avatar({
  className,
  size = 'default',
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge };
