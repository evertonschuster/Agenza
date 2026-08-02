import { InvalidCategoryError } from '@/features/catalog/domain/errors/InvalidCategoryError'
import { failure, success, type Result } from '@/shared/application/Result'

interface CreateCategoryInput {
  id: string
  name: string
}

/** A tenant-scoped grouping the business uses to organize its Services catalog (docs/DOMAIN.md "Category"). */
export class Category {
  readonly id: string
  readonly name: string

  private constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  static create(input: CreateCategoryInput): Result<Category, InvalidCategoryError> {
    if (input.id.trim().length === 0) {
      return failure(new InvalidCategoryError('O id da categoria não pode estar vazio'))
    }

    const name = input.name.trim()
    if (name.length === 0 || name.length > 60) {
      return failure(
        new InvalidCategoryError('O nome da categoria deve ter entre 1 e 60 caracteres'),
      )
    }

    return success(new Category(input.id, name))
  }
}
