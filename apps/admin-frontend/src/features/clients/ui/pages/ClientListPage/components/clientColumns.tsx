import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Link } from 'react-router';
import { maskCpf } from '@/shared/values/cpf';
import { ActionLink } from '@/shared/ui/action-link';
import { OptionalText } from '@/shared/ui/optional-text';
import { Skeleton } from '@/shared/ui/skeleton';
import type { ListSectionColumn } from '@/widgets/list-section';
import type { ClientListItem } from '../../../../model/clientList';
import { deleteClientPath, editClientPath } from '../../../clientsPaths';
import { ClientStatusBadge } from '../../../components/ClientStatusBadge';

export function clientColumns(): ListSectionColumn<ClientListItem>[] {
  return [
    {
      key: 'fullName',
      header: 'Nome',
      skeleton: <Skeleton className="h-5 w-40" />,
      cell: (client) => (
        <Link
          to={editClientPath(client.id)}
          className="rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {client.fullName}
        </Link>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      skeleton: <Skeleton className="h-5 w-28" />,
      cell: (client) => <OptionalText value={client.phone} className="whitespace-nowrap" />,
    },
    {
      key: 'email',
      header: 'E-mail',
      skeleton: <Skeleton className="h-5 w-72" />,
      cell: (client) => <OptionalText value={client.email} className="whitespace-nowrap" />,
    },
    {
      key: 'cpf',
      header: 'CPF',
      skeleton: <Skeleton className="h-5 w-24" />,
      cell: (client) => (
        <OptionalText
          value={client.cpf === null ? null : maskCpf(client.cpf)}
          className="whitespace-nowrap"
        />
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      skeleton: <Skeleton className="h-5 w-14 rounded-full" />,
      cell: (client) => <ClientStatusBadge status={client.status} className="align-top" />,
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'end',
      skeleton: (
        <div className="flex items-center gap-1">
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
        </div>
      ),
      cell: (client) => (
        <div className="flex items-center gap-1">
          <ActionLink
            to={editClientPath(client.id)}
            icon={PencilIcon}
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar ${client.fullName}`}
          />
          <ActionLink
            to={deleteClientPath(client.id)}
            icon={Trash2Icon}
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir ${client.fullName}`}
          />
        </div>
      ),
    },
  ];
}
