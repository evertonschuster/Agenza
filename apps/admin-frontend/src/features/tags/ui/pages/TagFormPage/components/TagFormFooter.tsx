import { Loader2Icon } from 'lucide-react';
import { useFormState } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { DialogClose, DialogFooter } from '@/shared/ui/dialog';

interface TagFormFooterProps {
  isLoading: boolean;
}

function TagFormFooter({ isLoading }: TagFormFooterProps) {
  const { isSubmitting } = useFormState();

  return (
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
      <Button type="submit" disabled={isLoading || isSubmitting}>
        {isSubmitting && <Loader2Icon aria-hidden="true" className="animate-spin" />}
        {isSubmitting ? 'Salvando…' : 'Salvar'}
      </Button>
    </DialogFooter>
  );
}

export { TagFormFooter };
