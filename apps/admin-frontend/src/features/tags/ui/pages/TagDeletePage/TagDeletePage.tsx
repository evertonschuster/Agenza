import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { useTagDeletePage } from './useTagDeletePage';

export function TagDeletePage() {
  const state = useTagDeletePage();
  if (!state) return null;

  const { tag, onOpenChange, onConfirm } = state;

  return (
    <ConfirmDialog
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      confirmation={{
        title: 'Excluir etiqueta?',
        description: `Tem certeza que deseja excluir a etiqueta "${tag.name}"? Essa ação não pode ser desfeita.`,
      }}
      success={{
        title: 'Etiqueta excluída',
        description: `"${tag.name}" foi excluída do catálogo.`,
      }}
    />
  );
}
