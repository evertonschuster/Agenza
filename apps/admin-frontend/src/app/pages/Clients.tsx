import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';

export function Clients() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Pessoas</h1>
          <p className="text-sm text-muted-foreground">
            A lista das pessoas atendidas vai aparecer aqui.
          </p>
        </div>
        <Link to="/pessoas/nova" className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Nova pessoa
        </Link>
      </div>
    </div>
  );
}
