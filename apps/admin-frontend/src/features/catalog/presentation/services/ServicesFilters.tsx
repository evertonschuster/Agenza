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

export interface ServicesFiltersProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  tagFilter: string
  onTagFilterChange: (value: string) => void
  categories: Category[]
  tags: Tag[]
  allCategoriesValue: string
  allTagsValue: string
}

export function ServicesFilters({
  searchInput,
  onSearchInputChange,
  categoryFilter,
  onCategoryFilterChange,
  tagFilter,
  onTagFilterChange,
  categories,
  tags,
  allCategoriesValue,
  allTagsValue,
}: ServicesFiltersProps): JSX.Element {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Input
        type="search"
        aria-label="Buscar serviço por nome"
        placeholder="Buscar por nome…"
        className="max-w-sm"
        value={searchInput}
        onChange={event => {
          onSearchInputChange(event.target.value)
        }}
      />
      <Select
        value={categoryFilter === '' ? allCategoriesValue : categoryFilter}
        onValueChange={value => {
          onCategoryFilterChange(value === allCategoriesValue ? '' : value)
        }}
      >
        <SelectTrigger aria-label="Filtrar por categoria" className="w-48">
          <SelectValue placeholder="Todas as categorias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allCategoriesValue}>Todas as categorias</SelectItem>
          {categories.map(category => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={tagFilter === '' ? allTagsValue : tagFilter}
        onValueChange={value => {
          onTagFilterChange(value === allTagsValue ? '' : value)
        }}
      >
        <SelectTrigger aria-label="Filtrar por etiqueta" className="w-48">
          <SelectValue placeholder="Todas as etiquetas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allTagsValue}>Todas as etiquetas</SelectItem>
          {tags.map(tag => (
            <SelectItem key={tag.id} value={tag.id}>
              {tag.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
