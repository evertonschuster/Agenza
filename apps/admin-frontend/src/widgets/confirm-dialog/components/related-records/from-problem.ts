import type { ApiProblem } from '@/shared/api/servicesFacade';
import { editClientPath } from '@/shared/routes/clientPaths';
import type { RelatedRecord, RelatedRecordGroup } from './related-records.types';

const RECORD_LIMIT = 10;

function readEntries(raw: unknown, code: string, requireCode = false) {
  if (!Array.isArray(raw)) return { items: [], limited: false };

  const items: RelatedRecord[] = [];
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object' || !('meta' in entry)) continue;
    const entryCode = 'code' in entry ? entry.code : undefined;
    if (requireCode ? !code || entryCode !== code : entryCode && entryCode !== code) continue;
    const meta = entry.meta;
    if (!meta || typeof meta !== 'object' || !('name' in meta)) continue;
    const name = typeof meta.name === 'string' ? meta.name.trim() : '';
    if (!name) continue;
    const id = 'id' in meta && typeof meta.id === 'string' ? meta.id.trim() : '';
    items.push(id && id !== '.' && id !== '..' ? { name, id } : { name });
  }
  return { items, limited: raw.length >= RECORD_LIMIT };
}

function personPath(person: RelatedRecord): string | undefined {
  if (!person.id) return undefined;
  try {
    return editClientPath(encodeURIComponent(person.id));
  } catch {
    return undefined;
  }
}

type KnownGroup = Omit<RelatedRecordGroup, 'items' | 'key'> & {
  field: string;
  limitNotice: string;
};

const KNOWN_GROUPS: readonly KnownGroup[] = [
  {
    field: 'clients',
    title: 'Pessoas',
    getEditPath: personPath,
    limitNotice: 'Mostramos até 10 pessoas. Pode haver outras vinculadas.',
  },
  {
    field: 'services',
    title: 'Serviços',
    description: 'O gerenciamento de serviços ainda não está disponível.',
    limitNotice: 'Mostramos até 10 serviços. Pode haver outros vinculados.',
  },
];

export function getRelatedRecordsContent(problem: ApiProblem): {
  groups: RelatedRecordGroup[];
  notices: string[];
} {
  const errors = problem.errors;
  const fields =
    errors && typeof errors === 'object' && !Array.isArray(errors) ? Object.entries(errors) : [];
  const code = problem.code ?? '';
  const notices: string[] = [];
  const groups: RelatedRecordGroup[] = KNOWN_GROUPS.map(({ field, limitNotice, ...group }) => {
    const raw = fields.find(([name]) => name.toLowerCase() === field.toLowerCase())?.[1];
    const { items, limited } = readEntries(raw, code);
    if (limited) notices.push(limitNotice);
    return { ...group, key: `known:${field.toLowerCase()}`, items };
  });
  const otherGroups = fields
    .filter(
      ([field]) => !KNOWN_GROUPS.some((known) => known.field.toLowerCase() === field.toLowerCase()),
    )
    .map(([, entries]) => readEntries(entries, code, true))
    .filter((group) => group.items.length > 0);
  if (otherGroups.some((group) => group.limited)) {
    notices.push('Mostramos até 10 registros por tipo. Pode haver outros vinculados.');
  }
  groups.push({
    key: 'other',
    title: 'Outros vínculos',
    items: otherGroups.flatMap((group) => group.items),
  });
  return { groups, notices };
}
