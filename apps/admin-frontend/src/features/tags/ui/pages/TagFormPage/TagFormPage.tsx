import { AlertCircleIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { ColorSwatchPicker } from '@/shared/ui/color-swatch-picker';
import { TAG_COLOR_PALETTE } from '../../../model/tag';
import { TagNotFoundDialog } from '../../components/TagNotFoundDialog';
import { useTagFormPage } from './useTagFormPage';

export function TagFormPage() {
  const state = useTagFormPage();

  if (state.mode === 'not-found') {
    return <TagNotFoundDialog onClose={state.onClose} />;
  }

  const {
    title,
    nameId,
    descriptionId,
    values,
    setValues,
    errors,
    generalError,
    isSubmitting,
    handleSubmit,
    handleOpenChange,
  } = state;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
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
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
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
              value={values.color}
              onValueChange={(color) => setValues({ ...values, color })}
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
              value={values.description}
              onChange={(event) => setValues({ ...values, description: event.target.value })}
              maxLength={200}
              aria-invalid={errors.description ? true : undefined}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
