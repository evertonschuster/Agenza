import { Plus } from 'lucide-react';
import { useShortcutHint } from '@/shared/keyboard/shortcuts';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { Button } from '@/shared/ui/button';
import { Kbd } from '@/shared/ui/kbd';
import { toast } from '@/shared/ui/toast';

function announceComingSoon(): void {
  toast.add({
    title: 'Em breve',
    description: 'A criação de serviços ainda não está disponível.',
  });
}

export function Servicos() {
  const hint = useShortcutHint('novo-servico');

  useShortcut('novo-servico', 'n', 'Novo serviço', announceComingSoon);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            A lista dos seus serviços, com categorias e etiquetas, vai aparecer aqui.
          </p>
        </div>
        <Button aria-keyshortcuts={hint.key} onClick={announceComingSoon}>
          <Plus aria-hidden="true" />
          <span>Novo serviço</span>
          {hint.visible && <Kbd className="ml-auto">{hint.displayKey}</Kbd>}
        </Button>
      </div>
    </div>
  );
}
