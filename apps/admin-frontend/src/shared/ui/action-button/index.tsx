import type { ActionButtonProps } from './action-button.types';
import { ActionButtonBase } from './components/action-button-base';
import { ActionButtonWithShortcut } from './components/action-button-with-shortcut';

function ActionButton({ shortcutId, ...props }: ActionButtonProps) {
  return shortcutId ? (
    <ActionButtonWithShortcut shortcutId={shortcutId} {...props} />
  ) : (
    <ActionButtonBase {...props} />
  );
}

export { ActionButton };
export type { ActionButtonProps };
