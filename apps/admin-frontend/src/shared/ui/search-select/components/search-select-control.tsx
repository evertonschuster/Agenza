import type { CSSProperties, Ref } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import type { SearchSelectItem } from '../search-select.types';

interface SearchSelectControlProps<T extends SearchSelectItem> {
  multiple: boolean;
  selected: readonly T[];
  placeholder: string;
  anchorRef: Ref<HTMLDivElement>;
  inputRef?: Ref<HTMLInputElement> | undefined;
  onBlur?: (() => void) | undefined;
  id?: string | undefined;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  className?: string | undefined;
}

function SearchSelectControl<T extends SearchSelectItem>({
  multiple,
  selected,
  placeholder,
  anchorRef,
  inputRef,
  onBlur,
  className,
  ...inputProps
}: SearchSelectControlProps<T>) {
  if (!multiple) {
    return (
      <InputGroup ref={anchorRef} className={cn('pointer-coarse:h-11', className)}>
        <ComboboxPrimitive.Input
          ref={inputRef}
          onBlur={onBlur}
          placeholder={placeholder}
          render={<InputGroupInput />}
          {...inputProps}
        />
        <InputGroupAddon align="inline-end">
          {selected.length > 0 && (
            <ComboboxPrimitive.Clear
              aria-label="Limpar seleção"
              render={<InputGroupButton size="icon-xs" />}
            >
              <XIcon aria-hidden="true" />
            </ComboboxPrimitive.Clear>
          )}
          <ComboboxPrimitive.Trigger
            aria-label="Mostrar opções"
            render={<InputGroupButton size="icon-xs" />}
          >
            <ChevronDownIcon aria-hidden="true" />
          </ComboboxPrimitive.Trigger>
        </InputGroupAddon>
      </InputGroup>
    );
  }

  return (
    <ComboboxPrimitive.Chips
      ref={anchorRef}
      data-slot="search-select-chips"
      className={cn(
        'relative flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent py-1 pr-8 pl-1.5 transition-colors pointer-coarse:min-h-11 has-disabled:opacity-50 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-background has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-3 has-[[aria-invalid=true]]:ring-destructive/20 dark:bg-input/30',
        className,
      )}
    >
      {selected.map((item) => (
        <ComboboxPrimitive.Chip
          key={item.id}
          style={item.color ? ({ '--tag': item.color } as CSSProperties) : undefined}
          className={cn(
            'inline-flex h-6 items-center gap-0.5 rounded-sm py-0 pr-0.5 pl-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
            item.color ? 'tag' : 'bg-muted text-foreground',
          )}
        >
          {item.name}
          <ComboboxPrimitive.ChipRemove
            aria-label={`Remover ${item.name}`}
            className="inline-flex size-4.5 items-center justify-center rounded-[3px] hover:bg-foreground/10"
          >
            <XIcon aria-hidden="true" className="size-3" />
          </ComboboxPrimitive.ChipRemove>
        </ComboboxPrimitive.Chip>
      ))}
      <ComboboxPrimitive.Input
        ref={inputRef}
        onBlur={onBlur}
        placeholder={placeholder}
        className="h-6 min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
        {...inputProps}
      />
      <ComboboxPrimitive.Trigger
        aria-label="Mostrar opções"
        className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-[calc(var(--radius)-3px)] text-muted-foreground hover:bg-muted hover:text-foreground pointer-coarse:top-2.5"
      >
        <ChevronDownIcon aria-hidden="true" className="size-4" />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.Chips>
  );
}

export { SearchSelectControl };
