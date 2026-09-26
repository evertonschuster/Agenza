import { useShortcutHint } from '@/shared/keyboard/shortcuts';
import { Kbd } from '@/shared/ui/kbd';
import type { LinkButtonWithShortcutProps } from '../link-button.types';
import { LinkButtonBase } from './link-button-base';

function LinkButtonWithShortcut({ shortcutId, ...props }: LinkButtonWithShortcutProps) {
  const hint = useShortcutHint(shortcutId);

  return (
    <LinkButtonBase
      {...props}
      aria-keyshortcuts={hint.ariaKeyshortcuts}
      keycap={hint.visible && <Kbd className="ml-auto">{hint.displayKey}</Kbd>}
    />
  );
}

export { LinkButtonWithShortcut };
