import type { ApiProblem } from '@/shared/api/servicesFacade';
import { CLIENTS_PATH } from '@/shared/routes/clientPaths';
import type { RelatedRecord, RelatedRecordGroup } from './related-records.types';

function readEntries(raw: unknown, code: string, requireCode = false) {
  if (!Array.isArray(raw)) return [];

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
  return items;
}

function editPathFor(basePath: string) {
  return (record: RelatedRecord): string | undefined => {
    if (!record.id) return undefined;
    try {
      return `${basePath}/${encodeURIComponent(record.id)}/editar`;
    } catch {
      return undefined;
    }
  };
}

type KnownGroup = Omit<RelatedRecordGroup, 'items' | 'key'> & {
  field: string;
};

const KNOWN_GROUPS: readonly KnownGroup[] = [
  {
    field: 'clients',
    title: 'Pessoas',
    getEditPath: editPathFor(CLIENTS_PATH),
  },
  {
    field: 'services',
    title: 'Serviços',
    getEditPath: editPathFor('/servicos'),
    description: 'O gerenciamento de serviços ainda não está disponível.',
  },
];

export function getRelatedRecordsContent(problem: ApiProblem): {
  groups: RelatedRecordGroup[];
} {
  const errors = problem.errors;
  const fields =
    errors && typeof errors === 'object' && !Array.isArray(errors) ? Object.entries(errors) : [];
  const code = problem.code ?? '';
  const groups: RelatedRecordGroup[] = KNOWN_GROUPS.map(({ field, ...group }) => {
    const raw = fields.find(([name]) => name.toLowerCase() === field.toLowerCase())?.[1];
    return { ...group, key: `known:${field.toLowerCase()}`, items: readEntries(raw, code) };
  });
  const otherItems = fields
    .filter(
      ([field]) => !KNOWN_GROUPS.some((known) => known.field.toLowerCase() === field.toLowerCase()),
    )
    .flatMap(([, entries]) => readEntries(entries, code, true));
  groups.push({
    key: 'other',
    title: 'Outros vínculos',
    items: otherItems,
  });
  return { groups };
}
