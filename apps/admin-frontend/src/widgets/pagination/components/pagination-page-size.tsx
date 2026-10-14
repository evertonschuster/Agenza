import { PAGE_SIZE_OPTIONS } from '@/shared/pagination/paging';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import type { PaginationPageSizeProps } from '../pagination.types';

function PaginationPageSize({ pageSize, onPageSizeChange, disabled }: PaginationPageSizeProps) {
  return (
    <Select
      value={pageSize}
      onValueChange={(value) => {
        if (value !== null) onPageSizeChange(value);
      }}
      disabled={disabled}
    >
      <div className="flex items-center gap-2">
        <SelectLabel>Itens por página</SelectLabel>
        <SelectTrigger>
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
