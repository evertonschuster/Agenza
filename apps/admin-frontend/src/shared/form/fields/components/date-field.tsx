import { useState, type Ref } from 'react';
import { useFormContext, type FieldValues } from 'react-hook-form';
import { CalendarIcon, XIcon } from 'lucide-react';
import { formatMaskedDate, maskDate, parseMaskedDate } from '@/shared/format/date';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import type { FormFieldControlProps } from '@/shared/ui/form-field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import type { DateFieldProps } from '../fields.types';
import { ControlledField } from './controlled-field';

type DateFieldControlProps = Omit<DateFieldProps<FieldValues>, 'hint' | 'label'> &
  FormFieldControlProps & {
    value: unknown;
    inputRef: Ref<HTMLInputElement>;
    onChange: (value: string) => void;
    onBlur: () => void;
  };

export function DateField<T extends FieldValues>({
  name,
  label,
  hint,
  ...rest
}: DateFieldProps<T>) {
  return (
    <ControlledField<T> name={name} label={label} hint={hint}>
      {(field, controlProps) => (
        <DateFieldControl
          {...rest}
          {...controlProps}
          name={field.name}
          value={field.value}
          inputRef={field.ref}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    </ControlledField>
  );
}

function DateFieldControl({
  value: fieldValue,
  inputRef,
  onChange,
  minDate,
  maxDate,
  placeholder = 'dd/mm/aaaa',
  ...inputProps
}: DateFieldControlProps) {
  const { setFocus } = useFormContext();
  const [open, setOpen] = useState(false);
  const { name, disabled, readOnly } = inputProps;
  const isLocked = Boolean(disabled || readOnly);

  const value = typeof fieldValue === 'string' ? fieldValue : '';
  const hasValue = value !== '';
  const typedDate = parseMaskedDate(value);
  const selected =
    typedDate !== null && typedDate >= minDate && typedDate <= maxDate ? typedDate : undefined;

  function selectDate(date: Date) {
    onChange(formatMaskedDate(date));
    setOpen(false);
  }

  function clearFromField() {
    onChange('');
    setFocus(name);
  }

  function clearFromCalendar() {
    onChange('');
    setOpen(false);
  }

  return (
    <InputGroup>
      <Popover open={open} onOpenChange={setOpen}>
        <InputGroupInput
          {...inputProps}
          ref={inputRef}
          value={value}
          inputMode="numeric"
          placeholder={placeholder}
          onChange={(event) => onChange(maskDate(event.target.value))}
        />
        <InputGroupAddon align="inline-end" className="gap-0.5">
          {hasValue && !isLocked && (
            <InputGroupButton size="icon-xs" aria-label="Limpar data" onClick={clearFromField}>
              <XIcon aria-hidden="true" />
            </InputGroupButton>
          )}
          <PopoverTrigger
            render={
              <InputGroupButton size="icon-xs" aria-label="Abrir calendário" disabled={isLocked} />
            }
          >
            <CalendarIcon aria-hidden="true" />
          </PopoverTrigger>
        </InputGroupAddon>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align="end"
          alignOffset={-8}
          sideOffset={10}
          initialFocus={false}
        >
          <Calendar
            mode="single"
            required
            autoFocus
            captionLayout="dropdown"
            timeZone="UTC"
            selected={selected}
            defaultMonth={selected ?? maxDate}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={[{ before: minDate }, { after: maxDate }]}
            onSelect={selectDate}
          />
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasValue}
              onClick={clearFromCalendar}
            >
              Limpar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </InputGroup>
  );
}
