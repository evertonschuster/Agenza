import { useId, useState, type JSX, type ReactNode } from 'react'
import { ChevronDownIcon, Plus } from 'lucide-react'
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
import { StatusMessage } from './StatusMessage'
import { cn } from '@/lib/utils'

export type CreatableSelectStatus = 'loading' | 'error' | 'success'

interface CreatableSelectHelpers<T> {
  close: () => void
  onCreated: (item: T) => void
}

interface CreatableSingleSelectProps<T> {
  id?: string
  label: string
  items: T[]
  value: string | null
  getKey: (item: T) => string
  getLabel: (item: T) => string
  onChange: (key: string | null) => void
  nullLabel: string
  searchPlaceholder: string
  emptyText: string
  createActionLabel: string
  renderCreateForm: (helpers: CreatableSelectHelpers<T>) => ReactNode
  status: CreatableSelectStatus
  error?: string | null
  onRetry?: (() => void) | undefined
}

/**
 * Built on shadcn/ui's Command (cmdk) instead of a hand-rolled listbox -
 * cmdk supplies full ARIA-combobox keyboard behavior (ArrowUp/Down, Home,
 * End, Enter, active-descendant tracking) and ties it into aria-expanded/
 * aria-controls automatically, which a hand-rolled version would have to
 * reimplement from scratch with more code and more room for gaps.
 */
export function CreatableSingleSelect<T>({
  id,
  label,
  items,
  value,
  getKey,
  getLabel,
  onChange,
  nullLabel,
  searchPlaceholder,
  emptyText,
  createActionLabel,
  renderCreateForm,
  status,
  error,
  onRetry,
}: CreatableSingleSelectProps<T>): JSX.Element {
  const contentId = useId()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'create'>('list')

  const selectedItem = items.find(item => getKey(item) === value)
  const triggerLabel = selectedItem !== undefined ? getLabel(selectedItem) : null

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen)
    if (!nextOpen) {
      setMode('list')
    }
  }

  function select(key: string | null): void {
    onChange(key)
    setOpen(false)
    setMode('list')
  }

  function handleCreated(item: T): void {
    select(getKey(item))
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={label}
          className="h-8 w-full justify-between px-2.5 font-normal"
        >
          <span className={cn('truncate', triggerLabel === null && 'text-muted-foreground')}>
            {triggerLabel ?? nullLabel}
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
            {status === 'loading' && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Spinner />
                Carregando…
              </div>
            )}
            {status === 'error' && (
              <div className="space-y-2 p-3">
                <StatusMessage tone="error">{error}</StatusMessage>
                {onRetry !== undefined && (
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Tentar novamente
                  </Button>
                )}
              </div>
            )}
            {status === 'success' && (
              <>
                <CommandList>
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value={nullLabel}
                      data-checked={value === null}
                      onSelect={() => {
                        select(null)
                      }}
                    >
                      {nullLabel}
                    </CommandItem>
                    {items.map(item => {
                      const key = getKey(item)
                      return (
                        <CommandItem
                          key={key}
                          value={getLabel(item)}
                          data-checked={value === key}
                          onSelect={() => {
                            select(key)
                          }}
                        >
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
  )
}
