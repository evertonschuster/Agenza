import { ColorField, FormErrorBanner, TextField, TextareaField } from '@/shared/ui/form-field';
import { TAG_COLOR_PALETTE } from '../../../../model/tag';
import {
  TAG_DESCRIPTION_MAX_LENGTH,
  TAG_NAME_MAX_LENGTH,
  type TagFormFieldValues,
} from '../../../../model/tagForm';

function TagFormBody() {
  return (
    <div className="space-y-4">
      <FormErrorBanner />

      <TextField<TagFormFieldValues>
        name="name"
        label="Nome"
        hint={`até ${TAG_NAME_MAX_LENGTH} caracteres`}
        maxLength={TAG_NAME_MAX_LENGTH}
        placeholder="Ex.: Promoção"
        autoComplete="off"
        autoFocus
      />

      <ColorField<TagFormFieldValues>
        name="color"
        label="Cor"
        aria-label="Cor da etiqueta"
        options={TAG_COLOR_PALETTE}
      />

      <TextareaField<TagFormFieldValues>
        name="description"
        label="Descrição"
        hint={`opcional · até ${TAG_DESCRIPTION_MAX_LENGTH} caracteres`}
        maxLength={TAG_DESCRIPTION_MAX_LENGTH}
        placeholder="Para que serve esta etiqueta?"
      />
    </div>
  );
}

export { TagFormBody };
