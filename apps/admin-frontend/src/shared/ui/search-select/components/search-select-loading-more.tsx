import type { SearchSelectLoadingMoreProps } from '../search-select.types';

function SearchSelectLoadingMore({ loadingMore }: SearchSelectLoadingMoreProps) {
  if (!loadingMore) return null;

  return <p className="px-2.5 py-1 text-xs text-muted-foreground">Carregando mais…</p>;
}

export { SearchSelectLoadingMore };
