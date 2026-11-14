import { DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import type { TagFormHeaderProps } from './TagFormHeader.types';

function TagFormHeader({ isEdit }: TagFormHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle>{isEdit ? 'Editar etiqueta' : 'Nova etiqueta'}</DialogTitle>
    </DialogHeader>
  );
}

export { TagFormHeader };
