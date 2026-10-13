import { Link } from 'react-router';
import { maskCpf } from '@/shared/values/cpf';
import { Badge } from '@/shared/ui/badge';
import type { ListSectionColumn } from '@/widgets/list-section';
import type { ClientListItem } from '../../../../model/clientList';
import { CLIENT_STATUS_LABELS, type ClientStatus } from '../../../../model/clientStatus';
import { clientDetailPath } from '../../../clientsPaths';
import { OptionalText } from './OptionalText';

const STATUS_BADGE_VARIANT: Record<ClientStatus, 'success' | 'muted'> = {
  active: 'success',
  inactive: 'muted',
};

export function clientColumns(): ListSectionColumn<ClientListItem>[] {
  return [
    {
      key: 'fullName',
      header: 'Nome',
      cell: (client) => (
        <Link
          to={clientDetailPath(client.id)}
          className="rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {client.fullName}
        </Link>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      cell: (client) => <OptionalText value={client.phone} />,
    },
    {
      key: 'email',
      header: 'E-mail',
      cell: (client) => <OptionalText value={client.email} />,
    },
    {
      key: 'cpf',
      header: 'CPF',
      cell: (client) => <OptionalText value={client.cpf === null ? null : maskCpf(client.cpf)} />,
    },
    {
      key: 'status',
      header: 'Situação',
      cell: (client) => (
        <Badge variant={STATUS_BADGE_VARIANT[client.status]}>
          {CLIENT_STATUS_LABELS[client.status]}
        </Badge>
      ),
    },
  ];
}
