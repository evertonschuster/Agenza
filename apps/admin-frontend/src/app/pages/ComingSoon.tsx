import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { ActionLink } from '@/shared/ui/action-link';
import { PageHeader } from '@/widgets/page-header';

export interface ComingSoonProps {
  icon: LucideIcon;
  description: string;
}

export function ComingSoon({ icon: Icon, description }: ComingSoonProps) {
  return (
    <div className="space-y-4">
      <PageHeader titleAddon={<Badge variant="secondary">Em breve</Badge>} />
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-7" aria-hidden="true" />
        </div>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        <ActionLink to="/" variant="outline">
          Voltar para o início
        </ActionLink>
      </div>
    </div>
  );
}
