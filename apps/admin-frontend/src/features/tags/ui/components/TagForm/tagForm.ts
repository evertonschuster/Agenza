import { z } from 'zod';
import { TAG_DESCRIPTION_MAX_LENGTH, TAG_NAME_MAX_LENGTH, type Tag } from '../../../model/tag';

export const tagFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome da etiqueta é obrigatório.')
    .max(
      TAG_NAME_MAX_LENGTH,
      `O nome da etiqueta deve ter no máximo ${TAG_NAME_MAX_LENGTH} caracteres.`,
    ),
  color: z
    .string()
    .nullable()
    .refine((value): value is string => value !== null, 'A cor da etiqueta é obrigatória.'),
  description: z
    .string()
    .trim()
    .max(
      TAG_DESCRIPTION_MAX_LENGTH,
      `A descrição da etiqueta deve ter no máximo ${TAG_DESCRIPTION_MAX_LENGTH} caracteres.`,
    )
    .transform((value) => value || null),
});

export type TagFormFieldValues = z.input<typeof tagFormSchema>;
export type TagFormValues = z.output<typeof tagFormSchema>;

export const TAG_FORM_FIELDS = tagFormSchema.keyof().options;

export function toTagFormFieldValues(tag?: Tag): TagFormFieldValues {
  return {
    name: tag?.name ?? '',
    color: tag?.color ?? null,
    description: tag?.description ?? '',
  };
}
