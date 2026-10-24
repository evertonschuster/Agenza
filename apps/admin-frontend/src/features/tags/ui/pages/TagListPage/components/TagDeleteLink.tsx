import { Trash2Icon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { Tag } from '../../../../model/tag';

interface TagDeleteLinkProps {
  tag: Tag;
  queryString: string;
}

function TagDeleteLink({ tag, queryString }: TagDeleteLinkProps) {
  return (
    <Link
      to={{ pathname: `${tag.id}/delete`, search: queryString }}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={`Excluir ${tag.name}`}
    >
      <Trash2Icon aria-hidden="true" />
    </Link>
  );
}

export { TagDeleteLink };
