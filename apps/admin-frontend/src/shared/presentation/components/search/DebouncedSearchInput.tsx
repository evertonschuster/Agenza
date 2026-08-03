import { useEffect, useRef, useState, type ComponentProps, type JSX } from 'react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/shared/presentation/hooks/useDebouncedValue'

type DebouncedSearchInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  onDebouncedChange: (value: string) => void
  delayMs?: number
}

export function DebouncedSearchInput({
  onDebouncedChange,
  delayMs = 300,
  ...rest
}: DebouncedSearchInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const debouncedValue = useDebouncedValue(inputValue, delayMs)

  // Keep a stable ref so the effect does not re-fire when the callback identity changes.
  const callbackRef = useRef(onDebouncedChange)
  callbackRef.current = onDebouncedChange

  useEffect(() => {
    callbackRef.current(debouncedValue)
  }, [debouncedValue])

  return (
    <Input
      {...rest}
      value={inputValue}
      onChange={event => {
        setInputValue(event.target.value)
      }}
    />
  )
}
