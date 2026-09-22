import { AlertCircleIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ColorSwatchPicker } from '@/shared/ui/color-swatch-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { TAG_COLOR_PALETTE } from '../../../model/tag';
import { TAG_DESCRIPTION_MAX_LENGTH, TAG_NAME_MAX_LENGTH } from '../../../model/tagForm';
import { useTagFormPage } from './useTagFormPage';

export function TagFormPage() {
  const state = useTagFormPage();
  if (!state) return null;

  const {
    tag,
    color,
    onColorChange,
    fieldErrors,
    formError,
    isSubmitting,
    onOpenChange,
    onSubmit,
  } = state;
  const isEdit = tag !== null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar etiqueta' : 'Nova etiqueta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tag-name">Nome</Label>
                <span id="tag-name-hint" className="text-xs text-muted-foreground">
                  até {TAG_NAME_MAX_LENGTH} caracteres
                </span>
              </div>
              <Input
                id="tag-name"
                name="name"
                defaultValue={tag?.name ?? ''}
                maxLength={TAG_NAME_MAX_LENGTH}
                placeholder="Ex.: Promoção"
                autoComplete="off"
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'tag-name-error' : 'tag-name-hint'}
              />
              {fieldErrors.name && (
                <p id="tag-name-error" className="text-sm text-destructive">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <ColorSwatchPicker
                options={TAG_COLOR_PALETTE}
                value={color}
                onValueChange={onColorChange}
                aria-label="Cor da etiqueta"
                aria-describedby={fieldErrors.color ? 'tag-color-error' : undefined}
              />
              {fieldErrors.color && (
                <p id="tag-color-error" className="text-sm text-destructive">
                  {fieldErrors.color}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tag-description">Descrição</Label>
                <span id="tag-description-hint" className="text-xs text-muted-foreground">
                  opcional · até {TAG_DESCRIPTION_MAX_LENGTH} caracteres
                </span>
              </div>
              <Textarea
                id="tag-description"
                name="description"
                defaultValue={tag?.description ?? ''}
                maxLength={TAG_DESCRIPTION_MAX_LENGTH}
                placeholder="Para que serve esta etiqueta?"
                aria-invalid={!!fieldErrors.description}
                aria-describedby={
                  fieldErrors.description ? 'tag-description-error' : 'tag-description-hint'
                }
              />
              {fieldErrors.description && (
                <p id="tag-description-error" className="text-sm text-destructive">
                  {fieldErrors.description}
                </p>
              )}
            </div>
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
