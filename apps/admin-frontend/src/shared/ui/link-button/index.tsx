import type { LinkButtonProps } from './link-button.types';
import { LinkButtonBase } from './components/link-button-base';
import { LinkButtonWithShortcut } from './components/link-button-with-shortcut';

function LinkButton({ shortcutId, ...props }: LinkButtonProps) {
  return shortcutId ? (
    <LinkButtonWithShortcut shortcutId={shortcutId} {...props} />
  ) : (
    <LinkButtonBase {...props} />
  );
}

export { LinkButton };
export type { LinkButtonProps };
