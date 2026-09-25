import type { FocusEventHandler, Ref } from 'react';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { CheckIcon } from 'lucide-react';

interface ColorSwatchPickerOption {
  value: string;
  label: string;
}

interface ColorSwatchPickerProps {
  options: readonly ColorSwatchPickerOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLDivElement> | undefined;
  ref?: Ref<HTMLElement> | undefined;
  'aria-label': string;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
}

function ColorSwatchPicker({
  options,
  value,
  onValueChange,
  onBlur,
  ref,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: ColorSwatchPickerProps) {
  const tabStop = options.find((option) => option.value === value) ?? options[0];

  return (
    <RadioGroup
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
      onBlur={onBlur}
      className="flex flex-wrap gap-2.5"
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          ref={option === tabStop ? ref : undefined}
          value={option.value}
          aria-label={option.label}
          title={option.label}
          style={{ backgroundColor: option.value }}
          className="relative flex size-[30px] shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0_/_12%)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[checked]:ring-2 data-[checked]:ring-ring"
        >
          <Radio.Indicator className="flex items-center justify-center">
            <CheckIcon
              aria-hidden="true"
              className="size-3.5 text-white drop-shadow-[0_0_1.5px_rgba(0,0,0,0.65)]"
            />
          </Radio.Indicator>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

export { ColorSwatchPicker };
export type { ColorSwatchPickerOption, ColorSwatchPickerProps };
