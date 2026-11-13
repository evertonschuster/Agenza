import { useEffect, useEffectEvent } from 'react';
import type { UseLoadMoreNearEndArgs } from './search-select.types';

const LOAD_MORE_DISTANCE_PX = 40;

export function useLoadMoreNearEnd(args: UseLoadMoreNearEndArgs) {
  const { list, items, loadMore } = args;

  function loadMoreNearEnd() {
    const node = list.current;
    if (!node) return;
    if (node.scrollHeight - node.scrollTop - node.clientHeight > LOAD_MORE_DISTANCE_PX) return;
    loadMore();
  }

  const loadMoreIfShort = useEffectEvent(loadMoreNearEnd);

  useEffect(() => {
    loadMoreIfShort();
  }, [items]);

  return loadMoreNearEnd;
}
