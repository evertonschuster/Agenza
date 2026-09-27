import { Plus } from 'lucide-react';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { ActionButton } from '@/shared/ui/action-button';
import { toast } from '@/shared/ui/toast';

const NEW_SERVICE_SHORTCUT_ID = 'novo-servico';

function announceComingSoon(): void {
  toast.add({
    title: 'Em breve',
    description: 'A criação de serviços ainda não está disponível.',
  });
}

export function Services() {
  useShortcut(NEW_SERVICE_SHORTCUT_ID, 'n', 'Novo serviço', announceComingSoon);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            A lista dos seus serviços, com categorias e etiquetas, vai aparecer aqui.
          </p>
        </div>
        <ActionButton icon={Plus} shortcutId={NEW_SERVICE_SHORTCUT_ID} onClick={announceComingSoon}>
          Novo serviço
        </ActionButton>
      </div>
    </div>
  );
}
