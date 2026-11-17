import { useId } from 'react';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { NewTabLink } from '@/shared/ui/new-tab-link';
import { getRelatedRecordGroups, type RelatedRecordGroup } from '../related-records';

function getEditPath(basePath: string | undefined, id: string | undefined) {
  if (!basePath || !id) return undefined;
  try {
    return `${basePath}/${encodeURIComponent(id)}/editar`;
  } catch {
    return undefined;
  }
}

function RelatedRecordSection({ group }: { group: RelatedRecordGroup }) {
  const headingId = useId();

  if (group.items.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="font-medium">
        {group.title}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {group.items.map((record, index) => {
          const path = getEditPath(group.basePath, record.id);
          return (
            <li key={`${record.id ?? record.name}-${index}`} className="break-words">
              {path ? (
                <NewTabLink to={path} className="max-w-full break-all text-left">
                  {record.name}
                  <span className="sr-only"> — abrir cadastro em outra aba</span>
                </NewTabLink>
              ) : (
                record.name
              )}
            </li>
          );
        })}
      </ul>
      {group.description && <div className="mt-2 text-muted-foreground">{group.description}</div>}
    </section>
  );
}

function ConfirmDialogRelatedRecords({ problem }: { problem: ApiProblem }) {
  const groups = getRelatedRecordGroups(problem);
  if (groups.every((group) => group.items.length === 0)) return null;
  return (
    <div className="space-y-4 text-sm">
      {groups.map((group) => (
        <RelatedRecordSection key={group.key} group={group} />
      ))}
    </div>
  );
}

export { ConfirmDialogRelatedRecords };
