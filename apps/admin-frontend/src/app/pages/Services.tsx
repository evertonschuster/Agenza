import { Plus } from 'lucide-react';
import { ActionButton } from '@/shared/ui/action-button';
import { toast } from '@/shared/ui/toast';
import { PageHeader } from '@/widgets/page-header';

function announceComingSoon(): void {
  toast.add({
    title: 'Em breve',
    description: 'A criação de serviços ainda não está disponível.',
  });
}

export function Services() {
  return (
    <PageHeader
      description="A lista dos seus serviços, com categorias e etiquetas, vai aparecer aqui."
      actions={
        <ActionButton icon={Plus} onClick={announceComingSoon}>
          Novo serviço
        </ActionButton>
      }
    />
  );
}
