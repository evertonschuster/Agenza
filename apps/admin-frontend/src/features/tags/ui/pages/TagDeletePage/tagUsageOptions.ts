import { editClientPath } from '@/shared/routes/clientPaths';
import type { RelatedRecord } from '@/shared/ui/related-records';
import type { RelatedRecordsOptions } from '@/shared/ui/related-records/from-problem';

function personPath(person: RelatedRecord): string | undefined {
  if (!person.id) return undefined;
  try {
    return editClientPath(encodeURIComponent(person.id));
  } catch {
    return undefined;
  }
}

export const tagUsageOptions: RelatedRecordsOptions = {
  code: 'Tag.InUse',
  limit: 10,
  groups: [
    {
      field: 'Clients',
      key: 'people',
      title: 'Pessoas',
      getEditPath: personPath,
      limitNotice: 'Mostramos até 10 pessoas. Pode haver outras vinculadas.',
    },
    {
      field: 'Services',
      key: 'services',
      title: 'Serviços',
      description: 'O gerenciamento de serviços ainda não está disponível.',
      limitNotice: 'Mostramos até 10 serviços. Pode haver outros vinculados.',
    },
  ],
  other: {
    key: 'other',
    title: 'Outros vínculos',
    limitNotice: 'Mostramos até 10 registros por tipo. Pode haver outros vinculados.',
  },
};
