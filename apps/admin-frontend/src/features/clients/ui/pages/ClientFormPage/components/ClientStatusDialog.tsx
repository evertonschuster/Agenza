import { UserCheckIcon, UserXIcon } from 'lucide-react';
import { ConfirmDialog } from '@/widgets/confirm-dialog';
import type { ClientStatusChange } from '../useClientFormPage.types';

interface ClientStatusDialogProps {
  statusChange: ClientStatusChange;
}

function ClientStatusDialog({ statusChange }: ClientStatusDialogProps) {
  const { fullName, status, onOpenChange, onConfirm, onChanged } = statusChange;

  if (status === 'active') {
    return (
      <ConfirmDialog
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onSuccess={onChanged}
        confirmation={{
          title: 'Desativar pessoa?',
          description: `${fullName} deixa de aparecer entre as pessoas ativas. O cadastro continua salvo e pode ser reativado quando precisar.`,
          icon: UserXIcon,
          confirmLabel: 'Desativar',
        }}
        error={{ blockedTitle: 'Não é possível desativar' }}
        success={{
          title: 'Pessoa desativada',
          description: `O cadastro de ${fullName} foi desativado.`,
        }}
      />
    );
  }

  return (
    <ConfirmDialog
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      onSuccess={onChanged}
      confirmation={{
        title: 'Reativar pessoa?',
        description: `${fullName} volta a aparecer entre as pessoas ativas.`,
        icon: UserCheckIcon,
        confirmLabel: 'Reativar',
        confirmVariant: 'default',
      }}
      error={{ blockedTitle: 'Não é possível reativar' }}
      success={{
        title: 'Pessoa reativada',
        description: `O cadastro de ${fullName} foi reativado.`,
      }}
    />
  );
}

export { ClientStatusDialog };
