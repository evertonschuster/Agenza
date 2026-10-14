import { getVisibleRange } from '@/shared/pagination/paging';
import type { PaginationSummaryProps } from '../pagination.types';

const LOCALE = 'pt-BR';
const numberFormat = new Intl.NumberFormat(LOCALE);
const pluralRules = new Intl.PluralRules(LOCALE);

function PaginationSummary({ page, pageSize, totalCount, itemLabel }: PaginationSummaryProps) {
  const { first, last } = getVisibleRange({ page, pageSize }, totalCount);
  const range =
    first === last
      ? numberFormat.format(first)
      : `${numberFormat.format(first)}–${numberFormat.format(last)}`;
  const noun = pluralRules.select(totalCount) === 'one' ? itemLabel.singular : itemLabel.plural;

  return (
    <p role="status" className="text-sm text-muted-foreground">
      {`Exibindo ${range} de ${numberFormat.format(totalCount)} ${noun}`}
    </p>
  );
}

export { PaginationSummary };
