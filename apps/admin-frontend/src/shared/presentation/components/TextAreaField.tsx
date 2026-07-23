import { forwardRef, type ComponentProps } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TextAreaFieldProps extends ComponentProps<typeof Textarea> {
  id: string
  label: string
  hint?: string
  showCount?: boolean
  error?: string | undefined
  /**
   * Current character count for the counter. Required for an accurate
   * counter when the field is used uncontrolled via react-hook-form's
   * `{...register(...)}` - that spread never includes `value` (RHF is
   * ref-based for uncontrolled fields), so deriving the count from a
   * `value` prop would always read 0. Compute it with RHF's `useWatch`
   * for just this field name so only its own changes re-render the
   * counter, not the whole form. Falls back to `value`'s length (or 0)
   * when omitted, which still works for a genuinely controlled textarea.
   */
  currentLength?: number
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField(
    { id, label, hint, showCount = false, maxLength, value, error, currentLength, ...rest },
    ref,
  ) {
    const errorId = `${id}-error`
    const count = currentLength ?? String(value ?? '').length

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
              {count}/{maxLength}
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
