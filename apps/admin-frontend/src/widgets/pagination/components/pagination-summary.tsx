import { formatCount, formatNumber } from '@/shared/format/count';
import type { PaginationSummaryProps } from '../pagination.types';

function PaginationSummary({ page, pageSize, totalCount, itemLabel }: PaginationSummaryProps) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);
  const range =
    first === last ? formatNumber(first) : `${formatNumber(first)}–${formatNumber(last)}`;

  return (
    <p role="status" className="text-sm text-muted-foreground">
      {`Exibindo ${range} de ${formatCount(totalCount, itemLabel)}`}
    </p>
  );
}

export { PaginationSummary };
