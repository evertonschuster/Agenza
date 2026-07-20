import { useState, type JSX, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface InlineCreatePopoverProps {
  triggerLabel: string
  title: string
  // Render prop so the embedded form (e.g. CategoryForm, TagForm) can close
  // the popover itself on success/cancel without this component knowing
  // anything about what it's creating.
  children: (close: () => void) => ReactNode
}

export function InlineCreatePopover({
  triggerLabel,
  title,
  children,
}: InlineCreatePopoverProps): JSX.Element {
  const [open, setOpen] = useState(false)

  function close(): void {
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1 px-1.5 py-0.5 text-xs text-primary hover:text-primary"
        >
          <Plus className="size-3" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="mb-3 text-sm font-medium text-foreground">{title}</p>
        {children(close)}
      </PopoverContent>
    </Popover>
  )
}
