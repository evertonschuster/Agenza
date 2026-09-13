import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';

export interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <Badge variant="secondary">Em breve</Badge>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        Voltar para o início
      </Link>
    </div>
  );
}
