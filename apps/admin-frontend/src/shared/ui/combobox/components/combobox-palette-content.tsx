import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { cn } from '@/shared/lib/utils';

function ComboboxPaletteContent({ className, children, ...props }: ComboboxPrimitive.Popup.Props) {
  const anchor = React.useRef<HTMLDivElement | null>(null);

  return (
    <>
      {/* Combobox.Positioner throws without an anchor, even for a centered modal palette with
          no visible trigger — this 0-size fixed point stands in for one. */}
      <div ref={anchor} className="fixed top-[20vh] left-1/2 size-0" aria-hidden="true" />
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <ComboboxPrimitive.Positioner
          anchor={anchor}
          align="center"
          positionMethod="fixed"
          className="z-50"
        >
          <ComboboxPrimitive.Popup
            data-slot="combobox-palette-content"
            className={cn(
              'group/combobox-palette-content flex max-h-[min(28rem,70vh)] w-[min(34rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
              className,
            )}
            {...props}
          >
            {children}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </>
  );
}

export { ComboboxPaletteContent };
