import { ConfirmDialog } from '@/widgets/confirm-dialog';
import { useTagDeletePage } from './useTagDeletePage';

export function TagDeletePage() {
  const { tag, onOpenChange, onConfirm } = useTagDeletePage();

  return (
    <ConfirmDialog
      loading={!tag}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      confirmation={{
        title: 'Excluir etiqueta?',
        description: tag && (
          <>
            <span className="block">Tem certeza que deseja excluir a etiqueta "{tag.name}"?</span>
            <span className="block">Essa ação não pode ser desfeita.</span>
          </>
        ),
      }}
      success={{
        title: 'Etiqueta excluída',
        description: tag && `"${tag.name}" foi excluída do catálogo.`,
      }}
    />
  );
}
