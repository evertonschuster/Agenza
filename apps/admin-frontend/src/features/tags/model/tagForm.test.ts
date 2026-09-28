import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Tag } from './tag';
import {
  TAG_DESCRIPTION_MAX_LENGTH,
  TAG_FORM_FIELDS,
  TAG_NAME_MAX_LENGTH,
  tagFormSchema,
  toTagFormFieldValues,
} from './tagForm';

function fieldError(input: unknown, field: 'name' | 'color' | 'description') {
  const result = tagFormSchema.safeParse(input);
  if (result.success) return undefined;
  return z.flattenError(result.error).fieldErrors[field]?.[0];
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
      const { fieldErrors } = z.flattenError(result.error);
      expect(fieldErrors.name).toBeDefined();
      expect(fieldErrors.color).toBeDefined();
    }
  });

  it('lists every schema field in TAG_FORM_FIELDS, so a backend error on any of them maps to its input', () => {
    expect(TAG_FORM_FIELDS).toEqual(['name', 'color', 'description']);
  });
});

describe('toTagFormFieldValues', () => {
  it('returns the empty form when there is no tag', () => {
    expect(toTagFormFieldValues()).toEqual({ name: '', color: null, description: '' });
  });

  it('round-trips a tag through the schema unchanged, null description included', () => {
    const tag: Tag = { id: '2', name: 'VIP', color: '#8b5cf6', description: null };

    const fieldValues = toTagFormFieldValues(tag);

    expect(fieldValues.description).toBe('');
    expect(tagFormSchema.parse(fieldValues)).toEqual({
      name: tag.name,
      color: tag.color,
      description: tag.description,
    });
  });
});
