import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { TagNotFoundDialog } from './components/TagNotFoundDialog';
import { useTagDeletePage } from './useTagDeletePage';
import { TagDeleteMode } from './useTagDeletePage.types';

export function TagDeletePage() {
  const state = useTagDeletePage();

  if (state.mode === TagDeleteMode.NotFound) {
    return <TagNotFoundDialog onClose={state.onClose} />;
  }

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
