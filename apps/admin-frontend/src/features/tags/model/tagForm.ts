import type { ApiProblem } from '@/shared/api/servicesFacade';

// Mirrors backend length limits (ServicesService.Domain.Entities.Tag.NameMaxLength /
// DescriptionMaxLength) so the maxLength attributes and messages below match what the backend
// itself enforces. UX pre-check only, never the source of truth — the backend's response is
// (spec FR-012); this only avoids a pointless round-trip for empty/too-long input.
export const TAG_NAME_MAX_LENGTH = 40;
export const TAG_DESCRIPTION_MAX_LENGTH = 200;

export interface TagFormInput {
  name: string;
  color: string | null;
  description: string;
}

export interface TagFormErrors {
  name?: string | undefined;
  color?: string | undefined;
  description?: string | undefined;
}

export function validateTagForm(input: TagFormInput): TagFormErrors {
  const errors: TagFormErrors = {};
  const name = input.name.trim();

  if (!name) {
    errors.name = 'O nome da etiqueta é obrigatório.';
  } else if (name.length > TAG_NAME_MAX_LENGTH) {
    errors.name = `O nome da etiqueta deve ter no máximo ${TAG_NAME_MAX_LENGTH} caracteres.`;
  }

  if (!input.color) {
    errors.color = 'A cor da etiqueta é obrigatória.';
  }

  if (input.description.trim().length > TAG_DESCRIPTION_MAX_LENGTH) {
    errors.description = `A descrição da etiqueta deve ter no máximo ${TAG_DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  return errors;
}

const FORM_FIELD_NAMES = ['name', 'color', 'description'] as const;

// errors is keyed by the backend command's PascalCase C# property (Name/Color/Description,
// docs/API.md §4.1) for a validation failure, or collapses to a single "" key for a
// Conflict/NotFound application error (Tag.DuplicateName, Tag.NotFound) — a key that matches no
// field on this form. Case-insensitive lookup handles the first; anything unmatched, including
// that "" key, falls back to a single form-level message.
export function toTagFormErrors(problem: ApiProblem): {
  fieldErrors: TagFormErrors;
  formError: string | null;
} {
  const byField = new Map<string, (typeof FORM_FIELD_NAMES)[number]>(
    FORM_FIELD_NAMES.map((field) => [field, field]),
  );
  const fieldErrors: TagFormErrors = {};
  const formLevel: string[] = [];

  for (const [key, entries] of Object.entries(problem.errors ?? {})) {
    const [firstEntry] = entries;
    const message = firstEntry?.message;
    if (!message) continue;

    const field = byField.get(key.toLowerCase());
    if (field) fieldErrors[field] = message;
    else formLevel.push(message);
  }

  if (formLevel.length === 0 && Object.keys(fieldErrors).length === 0 && problem.title) {
    formLevel.push(problem.title);
  }

  const [formError = null] = formLevel;
  return { fieldErrors, formError };
}
