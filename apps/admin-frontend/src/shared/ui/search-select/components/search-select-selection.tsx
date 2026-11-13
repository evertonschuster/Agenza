import { formatNumber } from '@/shared/format/count';
import { Button } from '@/shared/ui/button';
import type { SearchSelectSelectionProps } from '../search-select.types';

function SearchSelectSelection(props: SearchSelectSelectionProps) {
  const { selected, maxSelected, disabled, onClear } = props;
  const chosen =
    maxSelected === undefined
      ? `Selecionadas: ${formatNumber(selected)}`
      : `Selecionadas: ${formatNumber(selected)} de ${formatNumber(maxSelected)}`;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border py-1 pr-1 pl-2.5 text-xs text-muted-foreground">
      <span>{chosen}</span>
      <Button
        variant="ghost"
        size="sm"
        className="text-foreground"
        disabled={disabled || selected === 0}
        focusableWhenDisabled
        onClick={onClear}
      >
        Limpar seleção
      </Button>
    </div>
  );
}

export { SearchSelectSelection };
