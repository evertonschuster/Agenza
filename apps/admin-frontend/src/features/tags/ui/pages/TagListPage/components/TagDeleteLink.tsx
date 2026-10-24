import { Trash2Icon } from 'lucide-react';
import { ActionLink } from '@/shared/ui/action-link';
import type { Tag } from '../../../../model/tag';

interface TagDeleteLinkProps {
  tag: Tag;
  queryString: string;
}

function TagDeleteLink({ tag, queryString }: TagDeleteLinkProps) {
  return (
    <ActionLink
      to={{ pathname: `${tag.id}/delete`, search: queryString }}
      icon={Trash2Icon}
      variant="ghost"
      size="icon-sm"
      aria-label={`Excluir ${tag.name}`}
    />
  );
}

export { TagDeleteLink };
