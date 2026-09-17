export interface ColorSwatchOption {
  value: string;
  label: string;
}

export interface ColorSwatchPickerProps {
  options: readonly ColorSwatchOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  'aria-label': string;
  className?: string | undefined;
}
