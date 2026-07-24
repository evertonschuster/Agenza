import { forwardRef, type ComponentProps } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

// Omits every attribute this wrapper computes itself - a consumer must not
// be able to contradict `error` by passing its own aria-invalid/
// aria-describedby, and `id`/`children` are wrapper-owned too.
type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  'id' | 'children' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  label: string
  hint?: string
  error?: string | undefined
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, hint, error, ...rest },
  ref,
) {
  const errorId = `${id}-error`

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {hint !== undefined && <span className="font-normal text-muted-foreground">{hint}</span>}
      </Label>
      <Input
        {...rest}
        id={id}
        ref={ref}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
      />
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
})
