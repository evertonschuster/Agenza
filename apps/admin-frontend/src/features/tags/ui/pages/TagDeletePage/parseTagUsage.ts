import type { ApiProblem } from '@/shared/api/servicesFacade';

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

export function parseTagUsage(problem: ApiProblem) {
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
