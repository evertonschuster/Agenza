import type { ApiProblem } from './servicesFacade';

export type FormFieldError = NonNullable<ApiProblem['errors']>[string][number] & {
  message: string;
};

const toFieldPath = (key: string) => key.replace(/\[(\d+)\]/g, '.$1').toLowerCase();

export function toFormErrors<F extends string>(
  problem: ApiProblem,
  fields: readonly F[],
  aliases: Readonly<Record<string, F>> = {},
): { fieldErrors: Partial<Record<F, FormFieldError>>; formError: string | null } {
  const byField = new Map(fields.map((field) => [field.toLowerCase(), field]));
  const byAlias = new Map(
    Object.entries(aliases).map(([name, field]) => [name.toLowerCase(), field.toLowerCase()]),
  );
  const fieldErrors: Partial<Record<F, FormFieldError>> = {};
  const formLevel: string[] = [];

  for (const [key, entries] of Object.entries(problem.errors ?? {})) {
    const entry = entries[0];
    const message = entry?.message;
    if (!message) continue;
    const path = toFieldPath(key);
    const field = byField.get(byAlias.get(path.split(/[.[]/)[0] ?? path) ?? path);
    if (field) fieldErrors[field] ??= { ...entry, message };
    else formLevel.push(message);
  }

  if (formLevel.length === 0 && Object.keys(fieldErrors).length === 0 && problem.title) {
    formLevel.push(problem.title);
  }
  const [formError = null] = formLevel;
  return { fieldErrors, formError };
}
