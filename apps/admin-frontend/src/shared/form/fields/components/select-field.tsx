import {
  Controller,
  useFormContext,
  type FieldValues,
  type Path,
  type RefCallBack,
} from 'react-hook-form';
import { cn } from '@/shared/lib/utils';
import type { FormFieldControlProps } from '@/shared/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import type { SelectFieldOption, SelectFieldProps } from '../fields.types';
import { ControlledField } from './controlled-field';

export function SelectField<T extends FieldValues, N extends Path<T> = Path<T>>(
  props: SelectFieldProps<T, N>,
) {
  const { name, label, options, className } = props;
  const { control } = useFormContext<T>();

  if (props.labelPlacement === 'inline') {
    return (
      <Controller<T, N>
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <SelectControl
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            disabled={field.disabled}
            options={options}
            inlineLabel={label}
            className={className}
            aria-invalid={!!fieldState.error}
          />
        )}
      />
    );
  }

  return (
    <ControlledField<T, N> name={name} label={label} hint={props.hint}>
      {(field, controlProps) => (
        <SelectControl
          ref={field.ref}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={field.disabled}
          options={options}
          className={cn('w-full', className)}
          {...controlProps}
        />
      )}
    </ControlledField>
  );
}

interface SelectControlProps<V> extends Partial<FormFieldControlProps> {
  ref: RefCallBack;
  value: V;
  onChange: (value: V) => void;
  onBlur: () => void;
  disabled: boolean | undefined;
  options: readonly SelectFieldOption<V>[];
  inlineLabel?: string | undefined;
  className?: string | undefined;
}

function SelectControl<V>({
  ref,
  value,
  onChange,
  onBlur,
  disabled,
  options,
  inlineLabel,
  className,
  ...controlProps
}: SelectControlProps<V>) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      disabled={disabled ?? false}
    >
      {inlineLabel && <SelectLabel className="sr-only">{inlineLabel}</SelectLabel>}
      <SelectTrigger
        ref={ref}
        onBlur={onBlur}
        className={cn('pointer-coarse:h-11', className)}
        {...controlProps}
      >
        {inlineLabel && (
          <span aria-hidden="true" className="text-muted-foreground">
            {inlineLabel}:
          </span>
        )}
        <SelectValue>
          {(current: V) => options.find((option) => option.value === current)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
