import type { ApiProblem } from '@/shared/api/servicesFacade';
import { formatCount } from '@/shared/format/count';
import { Button } from '@/shared/ui/button';
import { ComboboxEmpty, ComboboxStatus } from '@/shared/ui/combobox';
import { Skeleton } from '@/shared/ui/skeleton';
import type { SearchPhase } from '../use-search-options';

const SELECTION_NOUN = { singular: 'seleção', plural: 'seleções' };

function limitNoticeOf(reachedLimit: number | null) {
  if (reachedLimit === null) return null;
  return `Limite de ${formatCount(reachedLimit, SELECTION_NOUN)} atingido. Remova uma para escolher outra.`;
}

function announcementOf(phase: SearchPhase, reachedLimit: number | null) {
  if (phase.kind === 'loadingFirst') return 'Carregando opções…';
  if (phase.kind === 'loadingNext') return 'Carregando mais opções…';
  return limitNoticeOf(reachedLimit) ?? '';
}

interface SearchSelectAnnouncementProps {
  phase: SearchPhase;
  reachedLimit: number | null;
}

function SearchSelectAnnouncement({ phase, reachedLimit }: SearchSelectAnnouncementProps) {
  return <ComboboxStatus className="sr-only">{announcementOf(phase, reachedLimit)}</ComboboxStatus>;
}

function SearchSelectLimitNotice({ reachedLimit }: { reachedLimit: number | null }) {
  const notice = limitNoticeOf(reachedLimit);
  if (!notice) return null;
  return <p className="m-1 mb-0 rounded-md bg-muted px-2.5 py-2">{notice}</p>;
}

interface SearchSelectEmptyProps {
  settled: boolean;
  searched: string;
  emptyMessage: string;
}

function emptyTextOf(searched: string, emptyMessage: string) {
  const text = searched.trim();
  if (text) return `Nenhum resultado para «${text}».`;
  return emptyMessage;
}

function SearchSelectEmpty({ settled, searched, emptyMessage }: SearchSelectEmptyProps) {
  return (
    <ComboboxEmpty className="px-3 py-4 empty:hidden">
      {settled ? emptyTextOf(searched, emptyMessage) : null}
    </ComboboxEmpty>
  );
}

function SearchSelectLoading() {
  return (
    <div aria-hidden="true" className="space-y-1 p-1">
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-7 w-3/5" />
    </div>
  );
}

interface SearchSelectFailureProps {
  problem: ApiProblem;
  errorMessage: string;
  onRetry: () => void;
}

function SearchSelectFailure({ problem, errorMessage, onRetry }: SearchSelectFailureProps) {
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

export {
  SearchSelectAnnouncement,
  SearchSelectEmpty,
  SearchSelectFailure,
  SearchSelectLimitNotice,
  SearchSelectLoading,
};
