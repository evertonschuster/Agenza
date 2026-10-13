import { ErrorState } from '@/shared/ui/error-state';
import { ListSection, ListSectionStatus } from '@/widgets/list-section';
import type { UseClientListPageResult } from '../useClientListPage.types';
import { clientColumns } from './clientColumns';
import { ClientListEmpty } from './ClientListEmpty';

type ClientListResultsProps = Pick<
  UseClientListPageResult,
  'status' | 'clients' | 'failure' | 'query' | 'onClearSearch' | 'onRetry'
>;

export function ClientListResults({
  status,
  clients,
  failure,
  query,
  onClearSearch,
  onRetry,
}: ClientListResultsProps) {
  if (failure) {
    return (
      <ErrorState
        title="Não foi possível carregar as pessoas."
        description={failure.message}
        code={failure.code}
        onRetry={onRetry}
      />
    );
  }

  if (status === ListSectionStatus.Ready && clients.length === 0) {
    return <ClientListEmpty query={query} onClearSearch={onClearSearch} />;
  }

  return (
    <ListSection
      status={status}
      items={clients}
      getKey={(client) => client.id}
      aria-label="Pessoas"
      columns={clientColumns()}
    />
  );
}
