import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  CLIENT_STATUS_FILTER_LABELS,
  CLIENT_STATUS_FILTERS,
  type ClientStatusFilter,
} from '../../../../model/clientListFilters';
import type { UseClientListPageResult } from '../useClientListPage.types';

type ClientStatusFilterSelectProps = Pick<
  UseClientListPageResult,
  'statusChoice' | 'onStatusChoiceChange'
>;

export function ClientStatusFilterSelect({
  statusChoice,
  onStatusChoiceChange,
}: ClientStatusFilterSelectProps) {
  return (
    <Select
      value={statusChoice}
      onValueChange={(value) => {
        if (value !== null) onStatusChoiceChange(value);
      }}
    >
      <SelectLabel className="sr-only">Situação</SelectLabel>
      <SelectTrigger className="w-full pointer-coarse:h-11 @pagination:w-fit">
        <span aria-hidden="true" className="text-muted-foreground">
          Situação:
        </span>
        <SelectValue>
          {(value: ClientStatusFilter) => CLIENT_STATUS_FILTER_LABELS[value]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {CLIENT_STATUS_FILTERS.map((status) => (
          <SelectItem key={status} value={status}>
            {CLIENT_STATUS_FILTER_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
