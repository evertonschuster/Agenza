import { ComboboxStatus } from '@/shared/ui/combobox';
import { limitNoticeOf } from '../limit-notice';
import type { SearchPhase, SearchSelectAnnouncementProps } from '../search-select.types';

function announcementOf(phase: SearchPhase, reachedLimit: number | null) {
  if (phase.kind === 'loadingFirst') return 'Carregando opções…';
  if (phase.kind === 'loadingNext') return 'Carregando mais opções…';
  return limitNoticeOf(reachedLimit) ?? '';
}

function SearchSelectAnnouncement({ phase, reachedLimit }: SearchSelectAnnouncementProps) {
  return <ComboboxStatus className="sr-only">{announcementOf(phase, reachedLimit)}</ComboboxStatus>;
}

export { SearchSelectAnnouncement };
