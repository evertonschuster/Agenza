import { formatCount } from '@/shared/format/count';

const SELECTION_NOUN = { singular: 'seleção', plural: 'seleções' };

export function limitNoticeOf(reachedLimit: number | null) {
  if (reachedLimit === null) return null;
  return `Limite de ${formatCount(reachedLimit, SELECTION_NOUN)} atingido. Remova uma para escolher outra.`;
}
