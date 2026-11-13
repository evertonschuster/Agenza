import { formatNumber } from '@/shared/format/count';
import type { SearchSelectProgressProps } from '../search-select.types';

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

export { SearchSelectProgress };
