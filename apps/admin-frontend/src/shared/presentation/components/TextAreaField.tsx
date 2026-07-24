import { forwardRef, type ComponentProps } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Omits every attribute this wrapper computes itself - a consumer must not
// be able to contradict `error` by passing its own aria-invalid/
// aria-describedby, and `id`/`children` are wrapper-owned too. `maxLength`
// is re-declared below, tied to `showCount`, instead of the plain optional
// number this type would otherwise inherit.
type TextAreaFieldProps = Omit<
  ComponentProps<typeof Textarea>,
  'id' | 'children' | 'aria-invalid' | 'aria-describedby' | 'maxLength'
> & {
  id: string
  label: string
  hint?: string
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
} &
  // showCount: true has nothing to render its counter against without a
  // maxLength - the component has no fallback "unbounded" counter format.
  ({ showCount: true; maxLength: number } | { showCount?: false; maxLength?: number })

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
          {showCount && (
            <span className="text-xs text-muted-foreground">
              {count}/{maxLength}
            </span>
          )}
        </div>
        <Textarea
          {...rest}
          id={id}
          ref={ref}
          maxLength={maxLength}
          value={value}
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
  },
)
