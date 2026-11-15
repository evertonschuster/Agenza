import type { ApiProblem } from '@/shared/api/servicesFacade';
import { editClientPath } from '@/shared/routes/clientPaths';
import type { RelatedRecord, RelatedRecordGroup } from '@/shared/ui/related-records';

interface Usage {
  name: string;
  id?: string;
}

interface UsageEntries {
  items: Usage[];
  limited: boolean;
}

function parseEntries(raw: unknown, requireCode = false): UsageEntries {
  if (!Array.isArray(raw)) return { items: [], limited: false };

  const items: Usage[] = [];
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object' || !('meta' in entry)) continue;
    const code = 'code' in entry ? entry.code : undefined;
    if (requireCode ? code !== 'Tag.InUse' : code && code !== 'Tag.InUse') continue;
    const meta = entry.meta;
    if (!meta || typeof meta !== 'object' || !('name' in meta)) continue;
    const name = typeof meta.name === 'string' ? meta.name.trim() : '';
    if (!name) continue;
    const id = 'id' in meta && typeof meta.id === 'string' ? meta.id.trim() : '';
    items.push(id && id !== '.' && id !== '..' ? { name, id } : { name });
  }

  return { items, limited: raw.length >= 10 };
}

function parseTagUsage(problem: ApiProblem) {
  const errors = problem.errors;
  const fields =
    errors && typeof errors === 'object' && !Array.isArray(errors) ? Object.entries(errors) : [];
  const findEntries = (name: string) => fields.find(([field]) => field.toLowerCase() === name)?.[1];
  const otherGroups = fields
    .filter(([field]) => !['clients', 'services'].includes(field.toLowerCase()))
    .map(([, entries]) => parseEntries(entries, true))
    .filter((group) => group.items.length > 0);

  return {
    people: parseEntries(findEntries('clients')),
    services: parseEntries(findEntries('services')),
    otherGroups,
  };
}

function personPath(person: RelatedRecord): string | undefined {
  if (!person.id) return undefined;
  try {
    return editClientPath(encodeURIComponent(person.id));
  } catch {
    return undefined;
  }
}

export function getTagUsageContent(problem: ApiProblem): {
  groups: RelatedRecordGroup[];
  notices: string[];
} {
  const { people, services, otherGroups } = parseTagUsage(problem);
  const notices: string[] = [];
  if (people.limited) notices.push('Mostramos até 10 pessoas. Pode haver outras vinculadas.');
  if (services.limited) notices.push('Mostramos até 10 serviços. Pode haver outros vinculados.');
  if (otherGroups.some((group) => group.limited)) {
    notices.push('Mostramos até 10 registros por tipo. Pode haver outros vinculados.');
  }

  return {
    groups: [
      { key: 'people', title: 'Pessoas', items: people.items, getEditPath: personPath },
      {
        key: 'services',
        title: 'Serviços',
        items: services.items,
        description: 'O gerenciamento de serviços ainda não está disponível.',
      },
      {
        key: 'other',
        title: 'Outros vínculos',
        items: otherGroups.flatMap((group) => group.items),
      },
    ],
    notices,
  };
}
