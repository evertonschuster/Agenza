import type { ApiProblem } from './servicesFacade';

export type FormFieldError = NonNullable<ApiProblem['errors']>[string][number] & {
  message: string;
};

const toFieldPath = (key: string) => key.replace(/\[(\d+)\]/g, '.$1').toLowerCase();

export function toFormErrors<F extends string>(
  problem: ApiProblem,
  fields: readonly F[],
): { fieldErrors: Partial<Record<F, FormFieldError>>; formError: string | null } {
  const byField = new Map(fields.map((field) => [field.toLowerCase(), field]));
  const fieldErrors: Partial<Record<F, FormFieldError>> = {};
  const formLevel: string[] = [];

  for (const [key, entries] of Object.entries(problem.errors ?? {})) {
    const entry = entries[0];
    const message = entry?.message;
    if (!message) continue;
    const field = byField.get(toFieldPath(key));
    if (field) fieldErrors[field] = { ...entry, message };
    else formLevel.push(message);
  }

  if (formLevel.length === 0 && Object.keys(fieldErrors).length === 0 && problem.title) {
    formLevel.push(problem.title);
  }
  const [formError = null] = formLevel;
  return { fieldErrors, formError };
}
