import { useId, useState, type JSX, type ReactNode } from 'react'
import { ChevronDownIcon, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
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
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'create'>('list')
  const [query, setQuery] = useState('')

  const selectedItem = items.find(item => getKey(item) === value)
  const triggerLabel = selectedItem !== undefined ? getLabel(selectedItem) : null
  const filtered = items.filter(item =>
    getLabel(item).toLowerCase().includes(query.trim().toLowerCase()),
  )

  function reset(): void {
    setMode('list')
    setQuery('')
  }

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
    }
  }

  function handleCreated(item: T): void {
    onChange(getKey(item))
    setOpen(false)
    reset()
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={label}
          className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <span className={cn(triggerLabel === null && 'text-muted-foreground')}>
            {triggerLabel ?? nullLabel}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        {mode === 'create' ? (
          <>
            <p className="mb-3 text-sm font-medium text-foreground">{createActionLabel}</p>
            {renderCreateForm({
              close: () => {
                setMode('list')
              },
              onCreated: handleCreated,
            })}
          </>
        ) : (
          <div className="space-y-2">
            <Input
              autoFocus
              type="text"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={query}
              onChange={event => {
                setQuery(event.target.value)
              }}
            />
            {status === 'loading' && (
              <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
                <Spinner />
                Carregando…
              </div>
            )}
            {status === 'error' && (
              <div className="space-y-2 px-1 py-2">
                <StatusMessage tone="error">{error}</StatusMessage>
                {onRetry !== undefined && (
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Tentar novamente
                  </Button>
                )}
              </div>
            )}
            {status === 'success' && (
              <div id={listId} role="listbox" className="max-h-56 space-y-0.5 overflow-y-auto">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === null}
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                    value === null && 'bg-accent text-accent-foreground',
                  )}
                >
                  {nullLabel}
                </button>
                {filtered.length === 0 && (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</p>
                )}
                {filtered.map(item => {
                  const key = getKey(item)
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={value === key}
                      onClick={() => {
                        onChange(key)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                        value === key && 'bg-accent text-accent-foreground',
                      )}
                    >
                      {getLabel(item)}
                    </button>
                  )
                })}
              </div>
            )}
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
        )}
      </PopoverContent>
    </Popover>
  )
}
