import { useRouteError } from 'react-router';
import { isApiProblemError } from '@/shared/api/unwrap';

export function CategoriesRouteError() {
  const error = useRouteError();
  const problem = isApiProblemError(error) ? error.problem : null;

  return (
    <p role="alert" className="max-w-lg text-sm text-destructive">
      {problem?.title ?? 'Algo deu errado.'}
      {problem?.code ? <span className="text-muted-foreground"> ({problem.code})</span> : null}
    </p>
  );
}
