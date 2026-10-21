import { ErrorState } from '@/shared/ui/error-state';
import type { ListSectionErrorProps } from '../list-section.types';

function ListSectionError({ title, failure }: ListSectionErrorProps) {
  return (
    <ErrorState
      title={title ?? 'Não foi possível carregar.'}
      description={failure?.message}
      code={failure?.code}
      onRetry={failure?.onRetry}
    />
  );
}

export { ListSectionError };
