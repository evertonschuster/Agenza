import { Trash2Icon } from 'lucide-react';
import { ActionLink } from '@/shared/ui/action-link';
import { deleteClientPath } from '../../../clientsPaths';
import type { ClientDeleteLinkProps } from './ClientDeleteLink.types';

function ClientDeleteLink({ client }: ClientDeleteLinkProps) {
  return (
    <ActionLink
      to={deleteClientPath(client.id)}
      icon={Trash2Icon}
      variant="ghost"
      size="icon-sm"
      aria-label={`Excluir ${client.fullName}`}
    />
  );
}

export { ClientDeleteLink };
