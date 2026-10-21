import { extractErrorMessage } from '@/shared/api/servicesFacade';
import { ErrorState } from '@/shared/ui/error-state';
import type { ListSectionErrorProps } from '../list-section.types';

function ListSectionError({ title, failure }: ListSectionErrorProps) {
  return (
    <ErrorState
      title={title ?? 'Não foi possível carregar.'}
      description={failure ? extractErrorMessage(failure.problem) : undefined}
      code={failure?.problem.code ?? undefined}
      onRetry={failure?.onRetry}
    />
  );
}

export { ListSectionError };
