import { DialogHeader, DialogTitle } from '@/shared/ui/dialog';

interface TagFormHeaderProps {
  isEdit: boolean;
}

function TagFormHeader({ isEdit }: TagFormHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle>{isEdit ? 'Editar etiqueta' : 'Nova etiqueta'}</DialogTitle>
    </DialogHeader>
  );
}

export { TagFormHeader };
