import type { CSSProperties } from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ColorSwatchOption, ColorSwatchPickerProps } from './color-swatch-picker.types';

function ColorSwatchPicker({
  options,
  value,
  onValueChange,
  className,
  ...props
}: ColorSwatchPickerProps) {
  return (
    <RadioGroup
      value={value ?? ''}
      onValueChange={onValueChange}
      className={cn('flex flex-wrap gap-2.5', className)}
      {...props}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          aria-label={option.label}
          title={option.label}
          style={{ '--swatch': option.value } as CSSProperties}
          className="flex size-7 items-center justify-center rounded-full bg-(--swatch) ring-1 ring-inset ring-foreground/15 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-checked:ring-2 data-checked:ring-ring data-checked:ring-offset-2 data-checked:ring-offset-background"
        >
          <Radio.Indicator
            // The glyph sits on a raw backend-supplied hue (spec FR-011's fixed palette), not a
            // theme surface — text-foreground/text-background can't promise contrast against an
            // arbitrary hex the way they do on card/popover. Unlike the .tag chip (FR-010, which
            // color-mixes toward the surface), a swatch's whole job is showing the true color, so
            // there is nothing to mix here; a white glyph with a dark halo is the deliberate
            // exception, tuned against all 8 palette entries rather than derived from a token.
            className="flex text-white [filter:drop-shadow(0_0_1px_rgb(0_0_0/60%))]"
          >
            <CheckIcon aria-hidden="true" className="size-4" />
          </Radio.Indicator>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

export { ColorSwatchPicker };
export type { ColorSwatchOption };
