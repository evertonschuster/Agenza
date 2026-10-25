import { Trash2Icon } from 'lucide-react';
import { ActionLink } from '@/shared/ui/action-link';
import type { Tag } from '../../../../model/tag';

interface TagDeleteLinkProps {
  tag: Tag;
}

function TagDeleteLink({ tag }: TagDeleteLinkProps) {
  return (
    <ActionLink
      to={`${tag.id}/delete`}
      icon={Trash2Icon}
      variant="ghost"
      size="icon-sm"
      aria-label={`Excluir ${tag.name}`}
    />
  );
}

export { TagDeleteLink };
