import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import type { PageHeaderBackLinkProps } from '../page-header.types';

function PageHeaderBackLink({ parent }: PageHeaderBackLinkProps) {
  return (
    <Link
      to={parent.to}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={`Voltar para ${parent.label}`}
    >
      <ArrowLeftIcon aria-hidden="true" />
    </Link>
  );
}

export { PageHeaderBackLink };
