import { InvalidTagError } from '@/features/catalog/domain/errors/InvalidTagError'

/** The only accepted `color` values (docs/API.md) - keeps tags visually consistent. */
export const TAG_COLOR_PALETTE = [
  '#0d9488', // teal
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#64748b', // slate
] as const

export type TagColor = (typeof TAG_COLOR_PALETTE)[number]

interface CreateTagInput {
  id: string
  name: string
  color: string
  description?: string
}

/**
 * A tenant-scoped label the business defines to organize its records
 * (docs/DOMAIN.md "Tag"). v1 manages the tag catalog only.
 */
export class Tag {
  readonly id: string
  readonly name: string
  readonly color: TagColor
  readonly description?: string

  private constructor(id: string, name: string, color: TagColor, description?: string) {
    this.id = id
    this.name = name
    this.color = color
    if (description !== undefined) {
      this.description = description
    }
  }

  static create(input: CreateTagInput): Tag {
    if (input.id.trim().length === 0) {
      throw new InvalidTagError('O id da etiqueta não pode estar vazio')
    }

    const name = input.name.trim()
    if (name.length === 0 || name.length > 40) {
      throw new InvalidTagError('O nome da etiqueta deve ter entre 1 e 40 caracteres')
    }

    if (!isTagColor(input.color)) {
      throw new InvalidTagError(
        `A cor da etiqueta deve ser uma das seguintes: ${TAG_COLOR_PALETTE.join(', ')}`,
      )
    }

    const description = input.description?.trim()
    if (description !== undefined && description.length > 200) {
      throw new InvalidTagError('A descrição da etiqueta deve ter no máximo 200 caracteres')
    }

    return new Tag(input.id, name, input.color, description !== '' ? description : undefined)
  }
}

function isTagColor(value: string): value is TagColor {
  return (TAG_COLOR_PALETTE as readonly string[]).includes(value)
}
