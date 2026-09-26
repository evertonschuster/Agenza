import { useShortcutHint } from '@/shared/keyboard/shortcuts';
import { Kbd } from '@/shared/ui/kbd';
import type { ActionButtonWithShortcutProps } from '../action-button.types';
import { ActionButtonBase } from './action-button-base';

function ActionButtonWithShortcut({ shortcutId, ...props }: ActionButtonWithShortcutProps) {
  const hint = useShortcutHint(shortcutId);

  return (
    <ActionButtonBase
      {...props}
      aria-keyshortcuts={hint.ariaKeyshortcuts}
      keycap={hint.visible && <Kbd className="ml-auto">{hint.displayKey}</Kbd>}
    />
  );
}

export { ActionButtonWithShortcut };
