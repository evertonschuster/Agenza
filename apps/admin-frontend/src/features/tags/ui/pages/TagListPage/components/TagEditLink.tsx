import { PencilIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { Tag } from '../../../../model/tag';

interface TagEditLinkProps {
  tag: Tag;
  queryString: string;
}

function TagEditLink({ tag, queryString }: TagEditLinkProps) {
  return (
    <Link
      to={{ pathname: `${tag.id}/edit`, search: queryString }}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={`Editar ${tag.name}`}
    >
      <PencilIcon aria-hidden="true" />
    </Link>
  );
}

export { TagEditLink };
