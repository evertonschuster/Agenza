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

function foldName(name: string) {
  return name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

export function suggestTagColor(name: string): string {
  let hash = 0;
  for (const char of foldName(name)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const option = TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length];
  if (!option) throw new Error('A paleta de etiquetas está vazia.');
  return option.value;
}
