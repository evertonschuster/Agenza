import { ConfirmDialog } from '@/widgets/confirm-dialog';
import { RelatedRecords } from '@/shared/ui/related-records';
import { getRelatedRecordsContent } from '@/shared/ui/related-records/from-problem';
import { useTagDeletePage } from './useTagDeletePage';
import { tagUsageOptions } from './tagUsageOptions';

export function TagDeletePage() {
  const { tag, onOpenChange, onConfirm } = useTagDeletePage();

  return (
    <ConfirmDialog
      loading={!tag}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      error={{
        blockedContent: (problem) =>
          problem.code === 'Tag.InUse' ? (
            <RelatedRecords {...getRelatedRecordsContent(problem, tagUsageOptions)} />
          ) : null,
        canRetryBlocked: (problem) => problem.code === 'Tag.InUse',
        blockedRetryLabel: 'Tentar excluir novamente',
      }}
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
