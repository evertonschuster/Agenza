import { describe, expect, it } from 'vitest';
import { TAG_DESCRIPTION_MAX_LENGTH, TAG_NAME_MAX_LENGTH, tagFormSchema } from './tagForm';

function fieldError(input: unknown, field: 'name' | 'color' | 'description') {
  const result = tagFormSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.flatten().fieldErrors[field]?.[0];
}

describe('tagFormSchema', () => {
  it('accepts a valid name, color and description', () => {
    const result = tagFormSchema.safeParse({
      name: 'Promoção',
      color: '#f59e0b',
      description: 'Desconto',
    });

    expect(result.success).toBe(true);
  });

  it('accepts an empty optional description and normalizes it to null', () => {
    const result = tagFormSchema.safeParse({ name: 'Promoção', color: '#f59e0b', description: '' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it('requires a name (spec FR-003)', () => {
    expect(fieldError({ name: '', color: '#f59e0b', description: '' }, 'name')).toBe(
      'O nome da etiqueta é obrigatório.',
    );
  });

  it('treats a whitespace-only name as empty', () => {
    expect(fieldError({ name: '   ', color: '#f59e0b', description: '' }, 'name')).toBe(
      'O nome da etiqueta é obrigatório.',
    );
  });

  it(`rejects a name over ${TAG_NAME_MAX_LENGTH} characters (spec FR-005)`, () => {
    const name = 'a'.repeat(TAG_NAME_MAX_LENGTH + 1);
    expect(fieldError({ name, color: '#f59e0b', description: '' }, 'name')).toBe(
      `O nome da etiqueta deve ter no máximo ${TAG_NAME_MAX_LENGTH} caracteres.`,
    );
  });

  it(`accepts a name of exactly ${TAG_NAME_MAX_LENGTH} characters`, () => {
    const name = 'a'.repeat(TAG_NAME_MAX_LENGTH);
    expect(tagFormSchema.safeParse({ name, color: '#f59e0b', description: '' }).success).toBe(true);
  });

  it('requires a color (spec FR-003)', () => {
    expect(fieldError({ name: 'Promoção', color: null, description: '' }, 'color')).toBe(
      'A cor da etiqueta é obrigatória.',
    );
  });

  it(`rejects a description over ${TAG_DESCRIPTION_MAX_LENGTH} characters (spec FR-005)`, () => {
    const description = 'a'.repeat(TAG_DESCRIPTION_MAX_LENGTH + 1);
    expect(fieldError({ name: 'Promoção', color: '#f59e0b', description }, 'description')).toBe(
      `A descrição da etiqueta deve ter no máximo ${TAG_DESCRIPTION_MAX_LENGTH} caracteres.`,
    );
  });

  it('treats a whitespace-only description as empty, not over the limit, and normalizes it to null (spec Edge Cases)', () => {
    const description = ' '.repeat(TAG_DESCRIPTION_MAX_LENGTH + 20);
    const result = tagFormSchema.safeParse({ name: 'Promoção', color: '#f59e0b', description });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it('reports all invalid fields at once', () => {
    const result = tagFormSchema.safeParse({ name: '', color: null, description: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name).toBeDefined();
      expect(fieldErrors.color).toBeDefined();
    }
  });
});
