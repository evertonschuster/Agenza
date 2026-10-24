import { PencilIcon } from 'lucide-react';
import { ActionLink } from '@/shared/ui/action-link';
import type { Tag } from '../../../../model/tag';

interface TagEditLinkProps {
  tag: Tag;
  queryString: string;
}

function TagEditLink({ tag, queryString }: TagEditLinkProps) {
  return (
    <ActionLink
      to={{ pathname: `${tag.id}/edit`, search: queryString }}
      icon={PencilIcon}
      variant="ghost"
      size="icon-sm"
      aria-label={`Editar ${tag.name}`}
    />
  );
}

export { TagEditLink };
