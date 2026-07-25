import { InvalidServiceError } from '@/features/catalog/domain/errors/InvalidServiceError'

// The real runtime check behind serviceMapper.ts's type-level `number` narrowing.
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFiniteInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value)
}

/** A tag summary as embedded on a Service (docs/API.md `TagSummaryDto`). */
export interface TagSummary {
  readonly id: string
  readonly name: string
  readonly color: string
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

/** A service the business offers that clients can book (docs/DOMAIN.md "Service"). */
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
  readonly tags: readonly TagSummary[]

  private constructor(
    id: string,
    code: number,
    name: string,
    durationMinutes: number,
    minDurationMinutes: number,
    maxDurationMinutes: number,
    price: number,
    maxDiscountPercentage: number,
    tags: readonly TagSummary[],
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
    this.tags = [...tags] // defensive copy - never store the caller's array by reference
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

    if (!isFiniteInteger(input.code)) {
      throw new InvalidServiceError('O código do serviço deve ser um número inteiro válido')
    }
    if (!isFiniteInteger(input.durationMinutes)) {
      throw new InvalidServiceError('A duração deve ser um número inteiro de minutos válido')
    }
    if (!isFiniteInteger(input.minDurationMinutes)) {
      throw new InvalidServiceError('A duração mínima deve ser um número inteiro de minutos válido')
    }
    if (!isFiniteInteger(input.maxDurationMinutes)) {
      throw new InvalidServiceError('A duração máxima deve ser um número inteiro de minutos válido')
    }
    if (!isFiniteNumber(input.price)) {
      throw new InvalidServiceError('O preço deve ser um número válido')
    }
    if (!isFiniteNumber(input.maxDiscountPercentage)) {
      throw new InvalidServiceError('O desconto máximo deve ser um número válido')
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
    if (description !== undefined && description.length > 500) {
      throw new InvalidServiceError('A descrição do serviço deve ter no máximo 500 caracteres')
    }

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
