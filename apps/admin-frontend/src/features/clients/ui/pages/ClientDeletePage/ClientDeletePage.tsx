import { ConfirmDialog } from '@/widgets/confirm-dialog';
import { useClientDeletePage } from './useClientDeletePage';

export function ClientDeletePage() {
  const { client, onOpenChange, onConfirm } = useClientDeletePage();

  return (
    <ConfirmDialog
      loading={!client}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      confirmation={{
        title: 'Excluir pessoa?',
        description: client && (
          <>
            <span className="block">Tem certeza que deseja excluir {client.fullName}?</span>
            <span className="block">Essa ação não pode ser desfeita.</span>
          </>
        ),
      }}
      success={{
        title: 'Pessoa excluída',
        description: client && `O cadastro de ${client.fullName} foi excluído.`,
      }}
    />
  );
}
