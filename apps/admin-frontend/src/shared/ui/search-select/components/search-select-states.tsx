import type { ApiProblem } from '@/shared/api/servicesFacade';
import { formatCount, formatNumber } from '@/shared/format/count';
import { Button } from '@/shared/ui/button';
import { ComboboxEmpty, ComboboxStatus } from '@/shared/ui/combobox';
import { Skeleton } from '@/shared/ui/skeleton';

const SELECTION_NOUN = { singular: 'seleção', plural: 'seleções' };

function limitNoticeOf(reachedLimit: number | null) {
  if (reachedLimit === null) return null;
  return `Limite de ${formatCount(reachedLimit, SELECTION_NOUN)} atingido. Remova uma para escolher outra.`;
}

function announcementOf(loading: 'first' | 'next' | null, reachedLimit: number | null) {
  if (loading === 'first') return 'Carregando opções…';
  if (loading === 'next') return 'Carregando mais opções…';
  return limitNoticeOf(reachedLimit) ?? '';
}

interface SearchSelectAnnouncementProps {
  loading: 'first' | 'next' | null;
  reachedLimit: number | null;
}

function SearchSelectAnnouncement({ loading, reachedLimit }: SearchSelectAnnouncementProps) {
  return (
    <ComboboxStatus className="sr-only">{announcementOf(loading, reachedLimit)}</ComboboxStatus>
  );
}

function SearchSelectLimitNotice({ reachedLimit }: { reachedLimit: number | null }) {
  const notice = limitNoticeOf(reachedLimit);
  if (!notice) return null;
  return <p className="m-1 mb-0 rounded-md bg-muted px-2.5 py-2">{notice}</p>;
}

interface SearchSelectStatusProps {
  loading: boolean;
  problem: ApiProblem | null;
  searched: string;
  emptyMessage: string;
  errorMessage: string;
  onRetry: () => void;
}

function emptyTextOf(searched: string, emptyMessage: string) {
  const text = searched.trim();
  if (text) return `Nenhum resultado para «${text}».`;
  return emptyMessage;
}

function SearchSelectStatus(props: SearchSelectStatusProps) {
  const { loading, problem, searched, emptyMessage, errorMessage, onRetry } = props;
  const settled = !loading && !problem;

  return (
    <>
      <ComboboxEmpty className="px-3 py-4 empty:hidden">
        {settled ? emptyTextOf(searched, emptyMessage) : null}
      </ComboboxEmpty>
      {loading && !problem && (
        <div aria-hidden="true" className="space-y-1 p-1">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-7 w-3/5" />
        </div>
      )}
      {problem && (
        <div role="alert" className="flex flex-col items-center gap-1 px-3 py-4 text-center">
          <p className="font-medium">{errorMessage}</p>
          {problem.title && <p className="text-muted-foreground">{problem.title}</p>}
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </>
  );
}

interface SearchSelectProgressProps {
  shown: number;
  totalCount: number;
  hasMore: boolean;
  loadingMore: boolean;
}

function SearchSelectProgress(props: SearchSelectProgressProps) {
  const { shown, totalCount, hasMore, loadingMore } = props;
  if (!hasMore && !loadingMore) return null;

  return (
    <p className="px-2.5 py-1 text-xs text-muted-foreground">
      {loadingMore
        ? 'Carregando mais…'
        : `Mostrando ${formatNumber(shown)} de ${formatNumber(totalCount)}`}
    </p>
  );
}

interface SearchSelectSelectionProps {
  selected: number;
  maxSelected: number | undefined;
  disabled: boolean;
  onClear: () => void;
}

function SearchSelectSelection(props: SearchSelectSelectionProps) {
  const { selected, maxSelected, disabled, onClear } = props;
  const chosen =
    maxSelected === undefined
      ? `Selecionadas: ${formatNumber(selected)}`
      : `Selecionadas: ${formatNumber(selected)} de ${formatNumber(maxSelected)}`;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border py-1 pr-1 pl-2.5 text-xs text-muted-foreground">
      <span>{chosen}</span>
      <Button
        variant="ghost"
        size="sm"
        className="text-foreground"
        disabled={disabled || selected === 0}
        focusableWhenDisabled
        onClick={onClear}
      >
        Limpar seleção
      </Button>
    </div>
  );
}

export {
  SearchSelectAnnouncement,
  SearchSelectLimitNotice,
  SearchSelectProgress,
  SearchSelectSelection,
  SearchSelectStatus,
};
