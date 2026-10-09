import { useState, type KeyboardEvent, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import {
  formatMaskedDate,
  isoToLocalDate,
  localDateToIso,
  maskDate,
  parseMaskedDate,
} from '@/shared/format/date';
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
  const [open, setOpen] = useState(false);
  const { disabled, readOnly } = inputProps;
  const isLocked = Boolean(disabled || readOnly);

  const value = typeof fieldValue === 'string' ? fieldValue : '';
  const typedDate = parseMaskedDate(value);
  const isSelectable = typedDate !== null && typedDate >= minDate && typedDate <= maxDate;
  const selected = isSelectable ? isoToLocalDate(typedDate) : undefined;
  const firstDay = isoToLocalDate(minDate);
  const lastDay = isoToLocalDate(maxDate);

  function selectDate(date: Date) {
    onChange(formatMaskedDate(localDateToIso(date)));
    setOpen(false);
  }

  function openOnArrowDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowDown' || isLocked) return;
    event.preventDefault();
    setOpen(true);
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
          onKeyDown={openOnArrowDown}
        />
        <InputGroupAddon align="inline-end">
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
            selected={selected}
            defaultMonth={selected ?? lastDay}
            startMonth={firstDay}
            endMonth={lastDay}
            disabled={[{ before: firstDay }, { after: lastDay }]}
            onSelect={selectDate}
          />
        </PopoverContent>
      </Popover>
    </InputGroup>
  );
}
