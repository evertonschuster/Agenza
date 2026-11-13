import { formatNumber } from '@/shared/format/count';
import { Button } from '@/shared/ui/button';

interface SearchSelectProgressProps {
  shown: number;
  totalCount: number;
  hasMore: boolean;
  loadingMore: boolean;
}

function SearchSelectProgress(props: SearchSelectProgressProps) {
  const { shown, totalCount, hasMore, loadingMore } = props;
  if (!hasMore && !loadingMore) return null;

  return (
    <p className="px-2.5 py-1 text-xs text-muted-foreground">
      {loadingMore
        ? 'Carregando mais…'
        : `Mostrando ${formatNumber(shown)} de ${formatNumber(totalCount)}`}
    </p>
  );
}

interface SearchSelectSelectionProps {
  selected: number;
  maxSelected: number | undefined;
  disabled: boolean;
  onClear: () => void;
}

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

export { SearchSelectProgress, SearchSelectSelection };
