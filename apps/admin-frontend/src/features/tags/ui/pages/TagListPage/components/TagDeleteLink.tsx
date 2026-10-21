import { Trash2Icon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { Tag } from '../../../../model/tag';

interface TagDeleteLinkProps {
  tag: Tag;
}

function TagDeleteLink({ tag }: TagDeleteLinkProps) {
  return (
    <Link
      to={`${tag.id}/delete`}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={`Excluir ${tag.name}`}
    >
      <Trash2Icon aria-hidden="true" />
    </Link>
  );
}

export { TagDeleteLink };
