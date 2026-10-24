import { PencilIcon } from 'lucide-react';
import { ActionLink } from '@/shared/ui/action-link';
import { editClientPath } from '../../../clientsPaths';
import type { ClientEditLinkProps } from './ClientEditLink.types';

function ClientEditLink({ client }: ClientEditLinkProps) {
  return (
    <ActionLink
      to={editClientPath(client.id)}
      icon={PencilIcon}
      variant="ghost"
      size="icon-sm"
      aria-label={`Editar ${client.fullName}`}
    />
  );
}

export { ClientEditLink };
