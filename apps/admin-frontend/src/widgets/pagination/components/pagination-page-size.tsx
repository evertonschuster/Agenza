import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import type { PaginationPageSizeProps } from '../pagination.types';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function PaginationPageSize({ pageSize, onPageSizeChange }: PaginationPageSizeProps) {
  return (
    <Select
      value={pageSize}
      onValueChange={(value) => {
        if (value !== null) onPageSizeChange(value);
      }}
    >
      <div className="flex items-center gap-2">
        <SelectLabel>
          <span aria-hidden="true" className="@pagination:hidden">
            Por página
          </span>
          <span className="sr-only @pagination:not-sr-only">Itens por página</span>
        </SelectLabel>
        <SelectTrigger className="pointer-coarse:h-11">
          <SelectValue />
        </SelectTrigger>
      </div>
      <SelectContent align="end" className="min-w-20">
        {PAGE_SIZE_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { PaginationPageSize };
