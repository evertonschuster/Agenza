import { forwardRef, type ComponentProps } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TextAreaFieldProps extends ComponentProps<typeof Textarea> {
  id: string
  label: string
  hint?: string
  showCount?: boolean
  error?: string | undefined
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField(
    { id, label, hint, showCount = false, maxLength, value, error, ...rest },
    ref,
  ) {
    const errorId = `${id}-error`

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={id}>
            {label}
            {hint !== undefined && (
              <span className="font-normal text-muted-foreground">{hint}</span>
            )}
          </Label>
          {showCount && maxLength !== undefined && (
            <span className="text-xs text-muted-foreground">
              {String(value ?? '').length}/{maxLength}
            </span>
          )}
        </div>
        <Textarea
          id={id}
          ref={ref}
          maxLength={maxLength}
          value={value}
          aria-invalid={error !== undefined}
          aria-describedby={error !== undefined ? errorId : undefined}
          {...rest}
        />
        {error !== undefined && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  },
)
