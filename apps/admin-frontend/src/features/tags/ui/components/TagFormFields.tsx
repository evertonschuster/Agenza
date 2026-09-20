import { useId } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { ColorSwatchPicker } from '@/shared/ui/color-swatch-picker';
import { TAG_COLOR_PALETTE } from '../../model/tag';
import type { TagFormErrors, TagFormValues } from '../../model/tagForm';

interface TagFormFieldsProps {
  values: TagFormValues;
  onValuesChange: (values: TagFormValues) => void;
  errors: TagFormErrors;
  generalError?: string | undefined;
}

function TagFormFields({ values, onValuesChange, errors, generalError }: TagFormFieldsProps) {
  const nameId = useId();
  const descriptionId = useId();

  return (
    <>
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
          onChange={(event) => onValuesChange({ ...values, name: event.target.value })}
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
          onValueChange={(color) => onValuesChange({ ...values, color })}
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
          onChange={(event) => onValuesChange({ ...values, description: event.target.value })}
          maxLength={200}
          aria-invalid={errors.description ? true : undefined}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>
    </>
  );
}

export { TagFormFields };
