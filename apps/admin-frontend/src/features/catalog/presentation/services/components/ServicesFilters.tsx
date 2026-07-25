import type { JSX } from 'react'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Radix Select can't take an empty-string value, so each filter maps "no
// filter" ("") to a local sentinel and back - an implementation detail of
// this component, not something callers need to know about.
const ALL_CATEGORIES_VALUE = '__all_categories__'
const ALL_TAGS_VALUE = '__all_tags__'

export interface ServiceFilterField {
  value: string
  onChange: (value: string) => void
}

export interface ServicesFiltersProps {
  search: ServiceFilterField
  category: ServiceFilterField & { options: readonly Category[] }
  tag: ServiceFilterField & { options: readonly Tag[] }
}

export function ServicesFilters({ search, category, tag }: ServicesFiltersProps): JSX.Element {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Input
        type="search"
        aria-label="Buscar serviço por nome"
        placeholder="Buscar por nome…"
        className="max-w-sm"
        value={search.value}
        onChange={event => {
          search.onChange(event.target.value)
        }}
      />
      <Select
        value={category.value === '' ? ALL_CATEGORIES_VALUE : category.value}
        onValueChange={value => {
          category.onChange(value === ALL_CATEGORIES_VALUE ? '' : value)
        }}
      >
        <SelectTrigger aria-label="Filtrar por categoria" className="w-48">
          <SelectValue placeholder="Todas as categorias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES_VALUE}>Todas as categorias</SelectItem>
          {category.options.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={tag.value === '' ? ALL_TAGS_VALUE : tag.value}
        onValueChange={value => {
          tag.onChange(value === ALL_TAGS_VALUE ? '' : value)
        }}
      >
        <SelectTrigger aria-label="Filtrar por etiqueta" className="w-48">
          <SelectValue placeholder="Todas as etiquetas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TAGS_VALUE}>Todas as etiquetas</SelectItem>
          {tag.options.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
