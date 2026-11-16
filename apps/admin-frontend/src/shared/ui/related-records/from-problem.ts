import type { ApiProblem } from '@/shared/api/servicesFacade';
import type { RelatedRecord, RelatedRecordGroup } from './index';

interface RelatedRecordGroupOption extends Omit<RelatedRecordGroup, 'items'> {
  field: string;
  limitNotice: string;
}

export interface RelatedRecordsOptions {
  code: string;
  limit: number;
  groups: readonly RelatedRecordGroupOption[];
  other: { key: string; title: string; limitNotice: string };
}

function readEntries(raw: unknown, code: string, limit: number, requireCode: boolean) {
  if (!Array.isArray(raw)) return { items: [], limited: false };

  const items: RelatedRecord[] = [];
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object' || !('meta' in entry)) continue;
    const entryCode = 'code' in entry ? entry.code : undefined;
    if (requireCode ? entryCode !== code : entryCode && entryCode !== code) continue;
    const meta = entry.meta;
    if (!meta || typeof meta !== 'object' || !('name' in meta)) continue;
    const name = typeof meta.name === 'string' ? meta.name.trim() : '';
    if (!name) continue;
    const id = 'id' in meta && typeof meta.id === 'string' ? meta.id.trim() : '';
    items.push(id && id !== '.' && id !== '..' ? { name, id } : { name });
  }
  return { items, limited: raw.length >= limit };
}

export function getRelatedRecordsContent(
  problem: ApiProblem,
  options: RelatedRecordsOptions,
): {
  groups: RelatedRecordGroup[];
  notices: string[];
} {
  const errors = problem.errors;
  const fields =
    errors && typeof errors === 'object' && !Array.isArray(errors) ? Object.entries(errors) : [];
  const notices: string[] = [];
  const groups: RelatedRecordGroup[] = options.groups.map(({ field, limitNotice, ...group }) => {
    const raw = fields.find(([name]) => name.toLowerCase() === field.toLowerCase())?.[1];
    const { items, limited } = readEntries(raw, options.code, options.limit, false);
    if (limited) notices.push(limitNotice);
    return { ...group, items };
  });
  const otherGroups = fields
    .filter(
      ([name]) => !options.groups.some((group) => group.field.toLowerCase() === name.toLowerCase()),
    )
    .map(([, raw]) => readEntries(raw, options.code, options.limit, true))
    .filter((group) => group.items.length > 0);
  groups.push({
    key: options.other.key,
    title: options.other.title,
    items: otherGroups.flatMap((group) => group.items),
  });
  if (otherGroups.some((group) => group.limited)) notices.push(options.other.limitNotice);
  return { groups, notices };
}
