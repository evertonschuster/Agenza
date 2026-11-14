import { PlusIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { SearchSelectCreateButtonProps } from '../search-select.types';

function SearchSelectCreateButton(props: SearchSelectCreateButtonProps) {
  const { label, disabled, limitNoticeId, onCreate } = props;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="shrink-0 text-primary pointer-coarse:h-10"
      disabled={disabled}
      focusableWhenDisabled
      aria-describedby={limitNoticeId}
      onClick={onCreate}
    >
      <PlusIcon aria-hidden="true" />
      {label}
    </Button>
  );
}

export { SearchSelectCreateButton };
