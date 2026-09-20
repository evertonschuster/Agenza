import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { TagUnavailableDialog } from '../../components/TagUnavailableDialog';
import { useTagRemovePage } from './useTagRemovePage';

export function TagRemovePage() {
  const state = useTagRemovePage();

  if (state.mode === 'not-found' || state.mode === 'error') {
    return (
      <TagUnavailableDialog
        reason={state.mode}
        onClose={state.onClose}
        onRetry={state.mode === 'error' ? state.onRetry : undefined}
      />
    );
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
