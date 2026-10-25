import { PencilIcon } from 'lucide-react';
import { ActionLink } from '@/shared/ui/action-link';
import type { Tag } from '../../../../model/tag';

interface TagEditLinkProps {
  tag: Tag;
}

function TagEditLink({ tag }: TagEditLinkProps) {
  return (
    <ActionLink
      to={`${tag.id}/edit`}
      icon={PencilIcon}
      variant="ghost"
      size="icon-sm"
      aria-label={`Editar ${tag.name}`}
    />
  );
}

export { TagEditLink };
