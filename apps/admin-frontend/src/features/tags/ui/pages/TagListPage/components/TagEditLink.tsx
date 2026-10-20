import { PencilIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { Tag } from '../../../../model/tag';

interface TagEditLinkProps {
  tag: Tag;
}

function TagEditLink({ tag }: TagEditLinkProps) {
  return (
    <Link
      to={`${tag.id}/edit`}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={`Editar ${tag.name}`}
    >
      <PencilIcon aria-hidden="true" />
    </Link>
  );
}

export { TagEditLink };
