import { ArrowLeftIcon } from 'lucide-react';
import { ActionLink } from '@/shared/ui/action-link';
import type { PageHeaderBackLinkProps } from '../page-header.types';

function PageHeaderBackLink({ parent }: PageHeaderBackLinkProps) {
  return (
    <ActionLink
      to={parent.to}
      icon={ArrowLeftIcon}
      variant="ghost"
      size="icon-sm"
      aria-label={`Voltar para ${parent.label}`}
    />
  );
}

export { PageHeaderBackLink };
