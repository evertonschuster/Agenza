import type { ComponentProps, JSX } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TextAreaFieldProps extends ComponentProps<typeof Textarea> {
  id: string
  label: string
  hint?: string
}

export function TextAreaField({ id, label, hint, ...rest }: TextAreaFieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {hint !== undefined && <span className="font-normal text-muted-foreground">{hint}</span>}
      </Label>
      <Textarea id={id} {...rest} />
    </div>
  )
}
