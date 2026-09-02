import { useRouteError } from 'react-router';
import { isApiProblemError } from '@/shared/api/unwrap';
import { FullScreenMessage } from '@/shared/ui/FullScreenMessage';

export function CategoriesPending() {
  return <p className="text-sm text-muted-foreground">Carregando…</p>;
}

export function CategoriesRouteError() {
  const error = useRouteError();
  const problem = isApiProblemError(error) ? error.problem : null;

  return (
    <FullScreenMessage
      title={problem?.title ?? 'Algo deu errado.'}
      description={problem?.code ?? 'Tente novamente.'}
    />
  );
}
