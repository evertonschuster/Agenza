import { useId, useState, type JSX, type ReactNode, type Ref } from 'react'
import { ChevronDownIcon, Plus, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'
import type { SelectLoadState } from '@/shared/presentation/components/SelectLoadState'
import { cn } from '@/lib/utils'

interface CreatableSelectHelpers<T> {
  close: () => void
  onCreated: (item: T) => void
}

interface CreatableMultiSelectProps<T> {
  id?: string
  label: string
  items: readonly T[]
  values: readonly string[]
  getKey: (item: T) => string
  getLabel: (item: T) => string
  getColor?: (item: T) => string
  onChange: (keys: string[]) => void
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  createActionLabel: string
  renderCreateForm: (helpers: CreatableSelectHelpers<T>) => ReactNode
  loadState: SelectLoadState
  /**
   * Forwarded to the trigger button - lets react-hook-form's setFocus(name)
   * land here when this field is wired through Controller (whose `field`
   * has no DOM node of its own to focus otherwise).
   */
  ref?: Ref<HTMLButtonElement>
}

/**
 * Built on shadcn/ui's Command (cmdk) instead of a hand-rolled listbox -
 * cmdk supplies full ARIA-combobox keyboard behavior (ArrowUp/Down, Home,
 * End, Enter, active-descendant tracking) and ties it into aria-expanded/
 * aria-controls automatically, which a hand-rolled version would have to
 * reimplement from scratch with more code and more room for gaps. Unlike
 * the single-select, choosing an item here keeps the popover open so
 * several can be toggled in one visit.
 */
export function CreatableMultiSelect<T>({
  id,
  label,
  items,
  values,
  getKey,
  getLabel,
  getColor,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  createActionLabel,
  renderCreateForm,
  loadState,
  ref,
}: CreatableMultiSelectProps<T>): JSX.Element {
  const contentId = useId()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'create'>('list')

  const selectedItems = values
    .map(key => items.find(item => getKey(item) === key))
    .filter((item): item is T => item !== undefined)

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen)
    if (!nextOpen) {
      setMode('list')
    }
  }

  function toggle(key: string): void {
    onChange(values.includes(key) ? values.filter(id => id !== key) : [...values, key])
  }

  function remove(key: string): void {
    onChange(values.filter(id => id !== key))
  }

  function handleCreated(item: T): void {
    const key = getKey(item)
    onChange(values.includes(key) ? [...values] : [...values, key])
    setOpen(false)
    setMode('list')
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={contentId}
            aria-label={label}
            className="h-8 w-full justify-between px-2.5 font-normal"
          >
            <span className={cn(selectedItems.length === 0 && 'text-muted-foreground')}>
              {selectedItems.length === 0
                ? placeholder
                : `${String(selectedItems.length)} selecionada(s)`}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent id={contentId} align="start" className="w-72 p-0">
          {mode === 'create' ? (
            <div className="p-3">
              <p className="mb-3 text-sm font-medium text-foreground">{createActionLabel}</p>
              {renderCreateForm({
                close: () => {
                  setMode('list')
                },
                onCreated: handleCreated,
              })}
            </div>
          ) : (
            <Command label={searchPlaceholder}>
              <CommandInput autoFocus placeholder={searchPlaceholder} />
              {loadState.status === 'loading' && (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Spinner />
                  Carregando…
                </div>
              )}
              {loadState.status === 'error' && (
                <div className="space-y-2 p-3">
                  <StatusMessage tone="error">{loadState.message}</StatusMessage>
                  {loadState.onRetry !== undefined && (
                    <Button type="button" variant="outline" size="sm" onClick={loadState.onRetry}>
                      Tentar novamente
                    </Button>
                  )}
                </div>
              )}
              {loadState.status === 'success' && (
                <>
                  <CommandList aria-multiselectable="true">
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandGroup>
                      {items.map(item => {
                        const key = getKey(item)
                        const isSelected = values.includes(key)
                        return (
                          <CommandItem
                            key={key}
                            value={getLabel(item)}
                            data-checked={isSelected}
                            onSelect={() => {
                              toggle(key)
                            }}
                          >
                            {getColor !== undefined && (
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: getColor(item) }}
                                aria-hidden="true"
                              />
                            )}
                            {getLabel(item)}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                  <div className="border-t border-border p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start gap-1 px-2 py-1.5 text-primary hover:text-primary"
                      onClick={() => {
                        setMode('create')
                      }}
                    >
                      <Plus className="size-3.5" />
                      {createActionLabel}
                    </Button>
                  </div>
                </>
              )}
            </Command>
          )}
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-1.5">
        {selectedItems.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma selecionada.</p>
        )}
        {selectedItems.map(item => {
          const key = getKey(item)
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-sm text-foreground"
            >
              {getColor !== undefined && (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getColor(item) }}
                  aria-hidden="true"
                />
              )}
              {getLabel(item)}
              <button
                type="button"
                aria-label={`Remover ${getLabel(item)}`}
                onClick={() => {
                  remove(key)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}
