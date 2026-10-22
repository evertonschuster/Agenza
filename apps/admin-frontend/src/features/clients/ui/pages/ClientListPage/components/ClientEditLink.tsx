import { PencilIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { ClientListItem } from '../../../../model/clientList';
import { editClientPath } from '../../../clientsPaths';

interface ClientEditLinkProps {
  client: ClientListItem;
}

function ClientEditLink({ client }: ClientEditLinkProps) {
  return (
    <Link
      to={editClientPath(client.id)}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={`Editar ${client.fullName}`}
    >
      <PencilIcon aria-hidden="true" />
    </Link>
  );
}

export { ClientEditLink };
