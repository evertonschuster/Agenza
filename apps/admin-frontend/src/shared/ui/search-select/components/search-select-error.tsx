import { Button } from '@/shared/ui/button';
import type { SearchSelectErrorProps } from '../search-select.types';

function SearchSelectError({ problem, errorMessage, onRetry }: SearchSelectErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-1 px-3 py-4 text-center">
      <p className="font-medium">{errorMessage}</p>
      {problem.title && <p className="text-muted-foreground">{problem.title}</p>}
      <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

export { SearchSelectError };
