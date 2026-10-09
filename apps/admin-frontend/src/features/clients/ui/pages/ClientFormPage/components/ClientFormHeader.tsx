import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';

function ClientFormHeader() {
  return (
    <header className="space-y-2">
      <Link
        to="/pessoas"
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: '-ml-2.5 text-muted-foreground',
        })}
      >
        <ArrowLeftIcon aria-hidden="true" />
        Voltar para Pessoas
      </Link>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Nova pessoa</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre a pessoa atendida e, se precisar, seus responsáveis e pessoas de referência.
        </p>
      </div>
    </header>
  );
}

export { ClientFormHeader };
