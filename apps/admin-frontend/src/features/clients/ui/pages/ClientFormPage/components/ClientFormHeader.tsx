import { UserCheckIcon, UserXIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/widgets/page-header';
import { CLIENTS_PATH } from '../../../clientsPaths';
import { ClientStatusBadge } from '../../../components/ClientStatusBadge';
import type { ClientFormHeaderProps } from './ClientFormHeader.types';

const PAGE_PARENTS = [{ label: 'Pessoas', to: CLIENTS_PATH }];

function ClientFormHeader({ isEdit, isSaving, statusChange }: ClientFormHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <PageHeader parents={PAGE_PARENTS} title={isEdit ? 'Editar pessoa' : 'Nova pessoa'} />
        {statusChange && <ClientStatusBadge status={statusChange.status} />}
      </div>
      {statusChange && (
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
      )}
    </div>
  );
}

export { ClientFormHeader };
