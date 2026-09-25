import { Loader2Icon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { DialogFooter } from '@/shared/ui/dialog';

interface TagFormFooterProps {
  onCancel: () => void;
  submitDisabled: boolean;
  isSubmitting: boolean;
}

function TagFormFooter({ onCancel, submitDisabled, isSubmitting }: TagFormFooterProps) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={submitDisabled}>
        {isSubmitting && <Loader2Icon aria-hidden="true" className="animate-spin" />}
        {isSubmitting ? 'Salvando…' : 'Salvar'}
      </Button>
    </DialogFooter>
  );
}

export { TagFormFooter };
