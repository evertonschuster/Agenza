import type { FocusEventHandler, Ref } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group';
import { CheckIcon } from 'lucide-react';

interface CheckboxGroupOption {
  value: string;
  label: string;
}

interface CheckboxGroupProps {
  options: readonly CheckboxGroupOption[];
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  onBlur?: FocusEventHandler<HTMLDivElement> | undefined;
  ref?: Ref<HTMLElement> | undefined;
  'aria-label': string;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
}

function CheckboxGroup({
  options,
  value,
  onValueChange,
  onBlur,
  ref,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: CheckboxGroupProps) {
  return (
    <CheckboxGroupPrimitive
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      value={[...value]}
      onValueChange={onValueChange}
      onBlur={onBlur}
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6"
    >
      {options.map((option, index) => (
        <label key={option.value} className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Checkbox.Root
            ref={index === 0 ? ref : undefined}
            value={option.value}
            aria-invalid={ariaInvalid}
            className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-transparent outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground aria-invalid:border-destructive dark:bg-input/30"
          >
            <Checkbox.Indicator className="flex items-center justify-center text-current">
              <CheckIcon aria-hidden="true" className="size-3.5" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          {option.label}
        </label>
      ))}
    </CheckboxGroupPrimitive>
  );
}

export { CheckboxGroup };
export type { CheckboxGroupOption, CheckboxGroupProps };
