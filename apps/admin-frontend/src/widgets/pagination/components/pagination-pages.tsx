import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { FIRST_PAGE } from '@/shared/pagination/paging';
import { Button } from '@/shared/ui/button';
import { getPageWindow } from '../page-window';
import type { PaginationPagesProps } from '../pagination.types';
import { PAGES_ROW } from './pagination-layout';

function PaginationPages({ page, lastPage, onPageChange }: PaginationPagesProps) {
  return (
    <nav aria-label="Paginação" className={PAGES_ROW}>
      <Button
        variant="outline"
        className="pointer-coarse:h-11"
        focusableWhenDisabled
        disabled={page <= FIRST_PAGE}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon aria-hidden="true" data-icon="inline-start" />
        Anterior
      </Button>

      <ol className="hidden items-center gap-1 @pagination:flex">
        {getPageWindow(page, lastPage).map((item, index) =>
          item === 'ellipsis' ? (
            <li key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant={item === page ? 'default' : 'ghost'}
                className="min-w-8 pointer-coarse:h-11 pointer-coarse:min-w-11"
                aria-current={item === page ? 'page' : undefined}
                aria-label={item === page ? `Página ${item}` : `Ir para a página ${item}`}
                onClick={() => {
                  if (item !== page) onPageChange(item);
                }}
              >
                {item}
              </Button>
            </li>
          ),
        )}
      </ol>

      <span className="min-w-0 flex-1 px-1 text-center text-sm leading-tight text-balance text-muted-foreground @pagination:hidden">
        {`Página ${page} de ${lastPage}`}
      </span>

      <Button
        variant="outline"
        className="pointer-coarse:h-11"
        focusableWhenDisabled
        disabled={page >= lastPage}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
        <ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
      </Button>
    </nav>
  );
}

export { PaginationPages };
