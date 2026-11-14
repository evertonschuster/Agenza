import { PlusIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import type { SearchSelectCreateRowProps } from '../search-select.types';

function SearchSelectCreateRow(props: SearchSelectCreateRowProps) {
  const { label, emphasized, disabled, onCreate } = props;

  return (
    <div className="border-t border-border p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('w-full justify-start text-primary', emphasized && 'bg-accent')}
        disabled={disabled}
        focusableWhenDisabled
        onClick={onCreate}
      >
        <PlusIcon aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </Button>
    </div>
  );
}

export { SearchSelectCreateRow };
