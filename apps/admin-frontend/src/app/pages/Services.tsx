import { Plus } from 'lucide-react';
import { ActionButton } from '@/shared/ui/action-button';
import { toast } from '@/shared/ui/toast';

function announceComingSoon(): void {
  toast.add({
    title: 'Em breve',
    description: 'A criação de serviços ainda não está disponível.',
  });
}

export function Services() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            A lista dos seus serviços, com categorias e etiquetas, vai aparecer aqui.
          </p>
        </div>
        <ActionButton icon={Plus} onClick={announceComingSoon}>
          Novo serviço
        </ActionButton>
      </div>
    </div>
  );
}
