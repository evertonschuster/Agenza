import { InvalidCategoryError } from '@/features/catalog/domain/errors/InvalidCategoryError'

interface CreateCategoryInput {
  id: string
  name: string
}

/**
 * A tenant-scoped grouping the business uses to organize its Services
 * catalog (docs/DOMAIN.md "Category").
 */
export class Category {
  readonly id: string
  readonly name: string

  private constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  static create(input: CreateCategoryInput): Category {
    if (input.id.trim().length === 0) {
      throw new InvalidCategoryError('O id da categoria não pode estar vazio')
    }

    const name = input.name.trim()
    if (name.length === 0 || name.length > 60) {
      throw new InvalidCategoryError('O nome da categoria deve ter entre 1 e 60 caracteres')
    }

    return new Category(input.id, name)
  }
}
