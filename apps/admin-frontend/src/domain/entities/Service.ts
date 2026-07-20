import { InvalidServiceError } from '../errors/InvalidServiceError'

/** A tag summary as embedded on a Service (docs/API.md `TagSummaryDto`). */
export interface TagSummary {
  id: string
  name: string
  color: string
}

interface CreateServiceInput {
  id: string
  code: number
  name: string
  description?: string
  durationMinutes: number
  minDurationMinutes: number
  maxDurationMinutes: number
  price: number
  maxDiscountPercentage: number
  categoryId?: string
  categoryName?: string
  tags: TagSummary[]
}

/**
 * A service the business offers that clients can book (docs/DOMAIN.md
 * "Service"). Bookable duration is a range (min/max) around a default
 * duration, and price can be discounted up to a per-service cap.
 */
export class Service {
  readonly id: string
  readonly code: number
  readonly name: string
  readonly description?: string
  readonly durationMinutes: number
  readonly minDurationMinutes: number
  readonly maxDurationMinutes: number
  readonly price: number
  readonly maxDiscountPercentage: number
  readonly categoryId?: string
  readonly categoryName?: string
  readonly tags: TagSummary[]

  private constructor(
    id: string,
    code: number,
    name: string,
    durationMinutes: number,
    minDurationMinutes: number,
    maxDurationMinutes: number,
    price: number,
    maxDiscountPercentage: number,
    tags: TagSummary[],
    description?: string,
    categoryId?: string,
    categoryName?: string,
  ) {
    this.id = id
    this.code = code
    this.name = name
    this.durationMinutes = durationMinutes
    this.minDurationMinutes = minDurationMinutes
    this.maxDurationMinutes = maxDurationMinutes
    this.price = price
    this.maxDiscountPercentage = maxDiscountPercentage
    this.tags = tags
    if (description !== undefined) {
      this.description = description
    }
    if (categoryId !== undefined) {
      this.categoryId = categoryId
    }
    if (categoryName !== undefined) {
      this.categoryName = categoryName
    }
  }

  static create(input: CreateServiceInput): Service {
    if (input.id.trim().length === 0) {
      throw new InvalidServiceError('O id do serviço não pode estar vazio')
    }

    const name = input.name.trim()
    if (name.length === 0 || name.length > 80) {
      throw new InvalidServiceError('O nome do serviço deve ter entre 1 e 80 caracteres')
    }

    if (input.minDurationMinutes < 1) {
      throw new InvalidServiceError('A duração mínima deve ser de pelo menos 1 minuto')
    }

    if (input.minDurationMinutes > input.durationMinutes) {
      throw new InvalidServiceError('A duração mínima não pode ser maior que a duração padrão')
    }

    if (input.durationMinutes > input.maxDurationMinutes) {
      throw new InvalidServiceError('A duração padrão não pode ser maior que a duração máxima')
    }

    if (input.maxDurationMinutes > 1440) {
      throw new InvalidServiceError('A duração máxima não pode exceder 1440 minutos (24 horas)')
    }

    if (input.price < 0) {
      throw new InvalidServiceError('O preço não pode ser negativo')
    }

    if (input.maxDiscountPercentage < 0 || input.maxDiscountPercentage > 100) {
      throw new InvalidServiceError('O desconto máximo deve estar entre 0 e 100%')
    }

    const description = input.description?.trim()

    return new Service(
      input.id,
      input.code,
      name,
      input.durationMinutes,
      input.minDurationMinutes,
      input.maxDurationMinutes,
      input.price,
      input.maxDiscountPercentage,
      input.tags,
      description !== '' ? description : undefined,
      input.categoryId,
      input.categoryName,
    )
  }
}
