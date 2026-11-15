import { useId } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { limitNoticeOf } from '../limit-notice';
import type { SearchSelectCreateButtonProps } from '../search-select.types';

function SearchSelectCreateButton(props: SearchSelectCreateButtonProps) {
  const { label, disabled, reachedLimit, onCreate } = props;
  const limitNoticeId = useId();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="shrink-0 text-primary pointer-coarse:h-10"
        disabled={disabled}
        focusableWhenDisabled
        aria-describedby={reachedLimit === null ? undefined : limitNoticeId}
        onClick={onCreate}
      >
        <PlusIcon aria-hidden="true" />
        {label}
      </Button>
      <span id={limitNoticeId} hidden>
        {limitNoticeOf(reachedLimit)}
      </span>
    </>
  );
}

export { SearchSelectCreateButton };
