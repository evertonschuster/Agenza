import { AlertCircleIcon } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { TAG_COLOR_PALETTE } from '../../../model/tag';
import {
  TAG_DESCRIPTION_MAX_LENGTH,
  TAG_NAME_MAX_LENGTH,
  TagColorField,
  TagTextField,
  TagTextareaField,
} from '../../../model/tagForm';
import { useTagFormPage } from './useTagFormPage';

export function TagFormPage() {
  const state = useTagFormPage();
  if (!state) return null;

  const { tag, methods, onOpenChange, onSubmit } = state;
  const { errors, isSubmitting } = methods.formState;
  const isEdit = tag !== null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="contents">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Editar etiqueta' : 'Nova etiqueta'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {errors.root?.serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{errors.root.serverError.message}</span>
                </div>
              )}

              <TagTextField
                name="name"
                label="Nome"
                hint={`até ${TAG_NAME_MAX_LENGTH} caracteres`}
                maxLength={TAG_NAME_MAX_LENGTH}
                placeholder="Ex.: Promoção"
                autoComplete="off"
              />

              <TagColorField
                name="color"
                label="Cor"
                aria-label="Cor da etiqueta"
                options={TAG_COLOR_PALETTE}
              />

              <TagTextareaField
                name="description"
                label="Descrição"
                hint={`opcional · até ${TAG_DESCRIPTION_MAX_LENGTH} caracteres`}
                placeholder="Para que serve esta etiqueta?"
              />
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
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
