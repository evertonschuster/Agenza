import { useEffect, useId, useState, type FormEvent } from 'react';
import { useFetcher } from 'react-router';
import { AlertCircleIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { ColorSwatchPicker } from '@/shared/ui/color-swatch-picker';
import { toast } from '@/shared/ui/toast';
import { validateTagForm, hasTagFormErrors, type TagFormErrors } from '../../../model/tagForm';
import { TAG_COLOR_PALETTE, type Tag } from '../../../model/tag';
import type { tagsAction } from './route';

interface TagFormDialogProps {
  tag: Tag | null;
  onOpenChange: (open: boolean) => void;
}

function serverErrors(data: Awaited<ReturnType<typeof tagsAction>> | undefined): {
  fieldErrors: TagFormErrors;
  generalError: string | undefined;
} {
  if (!data || data.ok) {
    return { fieldErrors: {}, generalError: undefined };
  }
  const byField = data.error.errors;
  return {
    fieldErrors: {
      name: byField?.['Name']?.[0]?.message,
      color: byField?.['Color']?.[0]?.message,
      description: byField?.['Description']?.[0]?.message,
    },
    generalError:
      byField?.['']?.[0]?.message ?? (byField ? undefined : (data.error.title ?? undefined)),
  };
}

function TagFormDialog({ tag, onOpenChange }: TagFormDialogProps) {
  const fetcher = useFetcher<typeof tagsAction>();
  const isEdit = tag !== null;

  const [name, setName] = useState(tag?.name ?? '');
  const [color, setColor] = useState<string | null>(tag?.color ?? null);
  const [description, setDescription] = useState(tag?.description ?? '');
  const [clientErrors, setClientErrors] = useState<TagFormErrors>({});

  const nameId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) {
      const trimmedName = name.trim();
      toast.add({
        title: isEdit ? 'Etiqueta atualizada' : 'Etiqueta criada',
        description: isEdit
          ? `"${trimmedName}" foi atualizada.`
          : `"${trimmedName}" foi adicionada ao catálogo.`,
        type: 'success',
      });
      onOpenChange(false);
    }
  }, [fetcher.state, fetcher.data, onOpenChange, isEdit, name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateTagForm({ name, color, description });
    if (hasTagFormErrors(validation)) {
      setClientErrors(validation);
      return;
    }

    setClientErrors({});
    void fetcher.submit(
      {
        intent: isEdit ? 'update' : 'create',
        ...(tag ? { id: tag.id } : {}),
        name,
        color: color ?? '',
        description,
      },
      { method: 'post' },
    );
  }

  const hasClientErrors = hasTagFormErrors(clientErrors);
  const { fieldErrors: apiFieldErrors, generalError: apiGeneralError } = serverErrors(fetcher.data);
  const errors = hasClientErrors ? clientErrors : apiFieldErrors;
  const generalError = hasClientErrors ? undefined : apiGeneralError;
  const isSubmitting = fetcher.state !== 'idle';

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar etiqueta' : 'Nova etiqueta'}</DialogTitle>
          </DialogHeader>

          {generalError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nome</Label>
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              aria-invalid={errors.name ? true : undefined}
              autoFocus
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <ColorSwatchPicker
              options={TAG_COLOR_PALETTE}
              value={color}
              onValueChange={setColor}
              aria-label="Cor da etiqueta"
            />
            {errors.color && <p className="text-sm text-destructive">{errors.color}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={descriptionId}>
              Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
              aria-invalid={errors.description ? true : undefined}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TagFormDialog };
