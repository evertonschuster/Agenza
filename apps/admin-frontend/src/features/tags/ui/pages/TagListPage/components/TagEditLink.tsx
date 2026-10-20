import { PencilIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { Tag } from '../../../../model/tag';

interface TagEditLinkProps {
  tag: Tag;
}

function TagEditLink({ tag }: TagEditLinkProps) {
  const location = useLocation();

  return (
    <Link
      to={{ pathname: `${tag.id}/edit`, search: location.search }}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={`Editar ${tag.name}`}
    >
      <PencilIcon aria-hidden="true" />
    </Link>
  );
}

export { TagEditLink };
