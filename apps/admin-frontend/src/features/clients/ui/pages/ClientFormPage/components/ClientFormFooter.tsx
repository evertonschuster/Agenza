import { Link } from 'react-router';
import { ActionButton } from '@/shared/ui/action-button';
import { Button, buttonVariants } from '@/shared/ui/button';

interface ClientFormFooterProps {
  isSaving: boolean;
}

function ClientFormFooter({ isSaving }: ClientFormFooterProps) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {isSaving ? (
        <Button type="button" variant="outline" disabled>
          Cancelar
        </Button>
      ) : (
        <Link to="/pessoas" className={buttonVariants({ variant: 'outline' })}>
          Cancelar
        </Link>
      )}
      <ActionButton type="submit" pending={isSaving}>
        {isSaving ? 'Salvando…' : 'Salvar'}
      </ActionButton>
    </div>
  );
}

export { ClientFormFooter };
