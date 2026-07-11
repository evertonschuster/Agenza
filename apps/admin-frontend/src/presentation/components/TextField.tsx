import type { JSX } from 'react'
import type { ComponentProps } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string
  label: string
  hint?: string
}

export function TextField({ id, label, hint, ...rest }: TextFieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {hint !== undefined && <span className="font-normal text-muted-foreground">{hint}</span>}
      </Label>
      <Input id={id} {...rest} />
    </div>
  )
}
