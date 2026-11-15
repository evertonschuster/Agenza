import { useId, type ReactNode } from 'react';
import { NewTabLink } from '@/shared/ui/new-tab-link';

export interface RelatedRecord {
  id?: string;
  name: string;
}

export interface RelatedRecordGroup {
  key: string;
  title: string;
  items: readonly RelatedRecord[];
  description?: ReactNode;
  getEditPath?: (record: RelatedRecord) => string | undefined;
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
          const path = group.getEditPath?.(record);
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

export function RelatedRecords({
  groups,
  notices = [],
}: {
  groups: readonly RelatedRecordGroup[];
  notices?: readonly string[];
}) {
  return (
    <div className="space-y-4 text-sm">
      {groups.map((group) => (
        <RelatedRecordSection key={group.key} group={group} />
      ))}
      {notices.map((notice) => (
        <p key={notice} className="text-muted-foreground">
          {notice}
        </p>
      ))}
    </div>
  );
}
