import type { ApiProblem } from '@/shared/api/servicesFacade';
import { editClientPath } from '@/shared/routes/clientPaths';
import { RelatedRecords, type RelatedRecord } from '@/shared/ui/related-records';
import { parseTagUsage } from './parseTagUsage';

function personPath(person: RelatedRecord): string | undefined {
  if (!person.id) return undefined;
  try {
    return editClientPath(encodeURIComponent(person.id));
  } catch {
    return undefined;
  }
}

export function TagUsageDetails({ problem }: { problem: ApiProblem }) {
  const { people, services, otherGroups } = parseTagUsage(problem);

  return (
    <div className="space-y-4 text-sm">
      <RelatedRecords
        groups={[
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
        ]}
      />
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
