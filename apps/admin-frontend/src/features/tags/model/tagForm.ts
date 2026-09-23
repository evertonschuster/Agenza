import { z } from 'zod';
import type { Path } from 'react-hook-form';
import { ColorField, TextField, TextareaField } from '@/shared/ui/form-field';

// Mirrors backend length limits (ServicesService.Domain.Entities.Tag.NameMaxLength /
// DescriptionMaxLength) so the maxLength attributes and messages below match what the backend
// itself enforces. UX pre-check only, never the source of truth — the backend's response is
// (spec FR-012); this only avoids a pointless round-trip for empty/too-long input.
export const TAG_NAME_MAX_LENGTH = 40;
export const TAG_DESCRIPTION_MAX_LENGTH = 200;

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
    // Empty or whitespace-only means "no description" on the wire, not the literal empty string.
    .transform((value) => value || null),
});

// The form's own fields are typed by the schema's *input* shape (before .transform/.refine
// narrow it) — that's what register()/Controller/defaultValues actually hold. onSubmit receives
// the *output* shape (after Zod has run), which is what the repository expects.
export type TagFormFieldValues = z.input<typeof tagFormSchema>;
export type TagFormValues = z.output<typeof tagFormSchema>;

export const TAG_FORM_FIELDS = Object.keys(
  tagFormSchema.shape,
) as readonly Path<TagFormFieldValues>[];

export const TagTextField = TextField<TagFormFieldValues>;
export const TagTextareaField = TextareaField<TagFormFieldValues>;
export const TagColorField = ColorField<TagFormFieldValues>;
