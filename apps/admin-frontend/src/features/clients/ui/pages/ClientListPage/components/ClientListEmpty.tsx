import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

interface ClientListEmptyProps {
  query: string;
  onClearSearch: () => void;
}

export function ClientListEmpty({ query, onClearSearch }: ClientListEmptyProps) {
  if (query) {
    return (
      <EmptyState
        title={`Nenhuma pessoa encontrada para «${query}»`}
        description="Confira a grafia ou busque pelo e-mail ou pelo CPF."
        action={
          <Button variant="outline" size="sm" onClick={onClearSearch}>
            Limpar busca
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      title="Nenhuma pessoa ativa ainda"
      description="Use o botão Nova pessoa para cadastrar a primeira."
    />
  );
}
