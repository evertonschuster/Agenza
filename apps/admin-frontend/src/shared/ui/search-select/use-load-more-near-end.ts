import { useEffect, useEffectEvent, type RefObject } from 'react';

const LOAD_MORE_DISTANCE_PX = 40;

interface UseLoadMoreNearEndArgs {
  list: RefObject<HTMLElement | null>;
  items: readonly unknown[];
  loadMore: () => void;
}

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
