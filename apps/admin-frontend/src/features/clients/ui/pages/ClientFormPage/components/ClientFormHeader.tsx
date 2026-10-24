import { UserCheckIcon, UserXIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/widgets/page-header';
import { ClientStatusBadge } from '../../../components/ClientStatusBadge';
import type { ClientFormHeaderProps } from './ClientFormHeader.types';

function ClientFormHeader({ isSaving, statusChange }: ClientFormHeaderProps) {
  if (!statusChange) return <PageHeader />;

  return (
    <PageHeader
      titleAddon={<ClientStatusBadge status={statusChange.status} />}
      actions={
        <Button type="button" variant="outline" disabled={isSaving} onClick={statusChange.onOpen}>
          {statusChange.status === 'active' ? (
            <>
              <UserXIcon aria-hidden="true" />
              Desativar pessoa
            </>
          ) : (
            <>
              <UserCheckIcon aria-hidden="true" />
              Reativar pessoa
            </>
          )}
        </Button>
      }
    />
  );
}

export { ClientFormHeader };
