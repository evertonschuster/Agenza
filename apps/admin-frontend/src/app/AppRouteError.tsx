import { isRouteErrorResponse, useRouteError } from 'react-router';
import { isApiProblemError } from '@/shared/api/unwrap';
import { logger } from '@/shared/logger';
import { FullScreenMessage } from '@/shared/ui/FullScreenMessage';

export function AppRouteError() {
  const error = useRouteError();

  if (isApiProblemError(error)) {
    const { title, code } = error.problem;
    logger.error('app.route_error', {
      message: title ?? error.message,
      ...(code ? { code } : {}),
    });
    return (
      <FullScreenMessage
        title={title ?? 'Algo deu errado.'}
        description={code ?? 'Recarregue a página.'}
      />
    );
  }

  if (isRouteErrorResponse(error)) {
    logger.error('app.route_error', { message: `${error.status} ${error.statusText}` });
    return (
      <FullScreenMessage
        title="Algo deu errado."
        description={`Erro ${error.status}. Recarregue a página.`}
      />
    );
  }

  logger.error('app.route_error', {
    message: error instanceof Error ? error.message : 'Erro desconhecido',
  });
  return <FullScreenMessage title="Algo deu errado." description="Recarregue a página." />;
}
