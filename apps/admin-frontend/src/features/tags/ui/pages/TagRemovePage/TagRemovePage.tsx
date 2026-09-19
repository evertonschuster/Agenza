import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { TagNotFoundDialog } from '../../components/TagNotFoundDialog';
import { useTagRemovePage } from './useTagRemovePage';

export function TagRemovePage() {
  const state = useTagRemovePage();

  if (state.mode === 'not-found') {
    return <TagNotFoundDialog onClose={state.onClose} />;
  }

  const { tag, onOpenChange, onConfirm } = state;

  return (
    <ConfirmDialog
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      confirmation={{
        description: `Tem certeza que deseja excluir a etiqueta "${tag.name}"? Essa ação não pode ser desfeita.`,
      }}
      success={{
        description: `"${tag.name}" foi removida do catálogo.`,
      }}
    />
  );
}
