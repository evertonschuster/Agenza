export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export interface TagColorOption {
  value: string;
  label: string;
}

export const TAG_COLOR_PALETTE: readonly TagColorOption[] = [
  { value: '#0d9488', label: 'Verde-azulado' },
  { value: '#0ea5e9', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#64748b', label: 'Cinza' },
];
