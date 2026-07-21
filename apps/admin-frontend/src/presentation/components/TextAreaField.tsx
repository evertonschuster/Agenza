import type { ComponentProps, JSX } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TextAreaFieldProps extends ComponentProps<typeof Textarea> {
  id: string
  label: string
  hint?: string
  showCount?: boolean
}

export function TextAreaField({
  id,
  label,
  hint,
  showCount = false,
  maxLength,
  value,
  ...rest
}: TextAreaFieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label}
          {hint !== undefined && <span className="font-normal text-muted-foreground">{hint}</span>}
        </Label>
        {showCount && maxLength !== undefined && (
          <span className="text-xs text-muted-foreground">
            {String(value ?? '').length}/{maxLength}
          </span>
        )}
      </div>
      <Textarea id={id} maxLength={maxLength} value={value} {...rest} />
    </div>
  )
}
