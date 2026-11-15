import type { ApiProblem } from '@/shared/api/servicesFacade';
import { editClientPath } from '@/shared/routes/clientPaths';
import { NewTabLink } from '@/shared/ui/new-tab-link';

interface Usage {
  name: string;
  id?: string;
}

function parseEntries(raw: unknown, requireCode = false): { items: Usage[]; limited: boolean } {
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

function usageEntries(problem: ApiProblem, key: string): { items: Usage[]; limited: boolean } {
  const errors = problem.errors;
  const raw: unknown =
    errors && typeof errors === 'object'
      ? Object.entries(errors).find(([field]) => field.toLowerCase() === key)?.[1]
      : undefined;
  return parseEntries(raw);
}

function otherUsageGroups(problem: ApiProblem): { items: Usage[]; limited: boolean }[] {
  if (!problem.errors || typeof problem.errors !== 'object' || Array.isArray(problem.errors)) {
    return [];
  }
  return Object.entries(problem.errors)
    .filter(([field]) => !['clients', 'services'].includes(field.toLowerCase()))
    .map(([, entries]) => parseEntries(entries, true))
    .filter((group) => group.items.length > 0);
}

function personPath(id: string | undefined): string | undefined {
  if (!id) return undefined;
  try {
    return editClientPath(encodeURIComponent(id));
  } catch {
    return undefined;
  }
}

export function TagUsageDetails({ problem }: { problem: ApiProblem }) {
  const people = usageEntries(problem, 'clients');
  const services = usageEntries(problem, 'services');
  const otherGroups = otherUsageGroups(problem);

  return (
    <div className="space-y-4 text-sm">
      {people.items.length > 0 && (
        <section aria-labelledby="tag-usage-people">
          <h3 id="tag-usage-people" className="font-medium">
            Pessoas
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {people.items.map((person, index) => {
              const path = personPath(person.id);
              return (
                <li key={`${person.id ?? person.name}-${index}`} className="break-words">
                  {path ? (
                    <NewTabLink to={path} className="max-w-full break-all text-left">
                      {person.name}
                      <span className="sr-only"> — abrir cadastro em outra aba</span>
                    </NewTabLink>
                  ) : (
                    person.name
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {services.items.length > 0 && (
        <section aria-labelledby="tag-usage-services">
          <h3 id="tag-usage-services" className="font-medium">
            Serviços
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {services.items.map((service, index) => (
              <li className="break-words" key={`${service.id ?? service.name}-${index}`}>
                {service.name}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">
            O gerenciamento de serviços ainda não está disponível.
          </p>
        </section>
      )}
      {otherGroups.length > 0 && (
        <section aria-labelledby="tag-usage-other">
          <h3 id="tag-usage-other" className="font-medium">
            Outros vínculos
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {otherGroups
              .flatMap((group) => group.items)
              .map((usage, index) => (
                <li key={`${usage.name}-${index}`} className="break-words">
                  {usage.name}
                </li>
              ))}
          </ul>
        </section>
      )}
      {people.limited && (
        <p className="text-muted-foreground">
          Mostramos até 10 pessoas. Pode haver outras vinculadas.
        </p>
      )}
      {services.limited && (
        <p className="text-muted-foreground">
          Mostramos até 10 serviços. Pode haver outros vinculados.
        </p>
      )}
      {otherGroups.some((group) => group.limited) && (
        <p className="text-muted-foreground">
          Mostramos até 10 registros por tipo. Pode haver outros vinculados.
        </p>
      )}
    </div>
  );
}
