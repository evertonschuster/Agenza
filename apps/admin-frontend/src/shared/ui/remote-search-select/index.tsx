import { DEFAULT_PAGE_SIZE } from '@/shared/pagination/paging';
import { SearchSelect, type SearchSelectItem } from '@/shared/ui/search-select';
import { RemoteItemsStatus, type RemoteSearchSelectProps } from './remote-search-select.types';
import { useRemoteItems } from './use-remote-items';

function RemoteSearchSelect<T extends SearchSelectItem>(props: RemoteSearchSelectProps<T>) {
  const { loadItems, pageSize = DEFAULT_PAGE_SIZE, ...selectProps } = props;
  const remote = useRemoteItems({ loadItems, pageSize });
  const { status, items, totalCount, problem } = remote.state;

  return (
    <SearchSelect<T>
      {...selectProps}
      items={items}
      loading={status === RemoteItemsStatus.Idle || status === RemoteItemsStatus.Loading}
      failure={
        status === RemoteItemsStatus.Error
          ? { detail: problem?.title ?? undefined, onRetry: remote.retry }
          : undefined
      }
      more={
        remote.hasMore
          ? {
              total: totalCount,
              pending: status === RemoteItemsStatus.LoadingMore,
              onLoadMore: remote.loadMore,
            }
          : undefined
      }
      onOpenChange={(open) => (open ? remote.open() : remote.close())}
      onSearchChange={remote.search}
    />
  );
}

export { RemoteSearchSelect };
export type {
  LoadRemoteItems,
  RemoteItemsQuery,
  RemoteSearchSelectProps,
} from './remote-search-select.types';
