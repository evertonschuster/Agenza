import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { Tag } from '../../../../model/tag';

interface TagActionsProps {
  tag: Tag;
}

function TagActions({ tag }: TagActionsProps) {
  const location = useLocation();
  const hrefFor = (suffix: string) => ({
    pathname: `${tag.id}/${suffix}`,
    search: location.search,
  });

  return (
    <div className="flex justify-end gap-1">
      <Link
        to={hrefFor('edit')}
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        aria-label={`Editar ${tag.name}`}
      >
        <PencilIcon aria-hidden="true" />
      </Link>
      <Link
        to={hrefFor('remove')}
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        aria-label={`Excluir ${tag.name}`}
      >
        <Trash2Icon aria-hidden="true" />
      </Link>
    </div>
  );
}

export { TagActions };
