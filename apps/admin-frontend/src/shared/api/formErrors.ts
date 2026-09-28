import type { ApiProblem } from './servicesFacade';

export function toFormErrors<F extends string>(
  problem: ApiProblem,
  fields: readonly F[],
): { fieldErrors: Partial<Record<F, string>>; formError: string | null } {
  const byField = new Map(fields.map((field) => [field.toLowerCase(), field]));
  const fieldErrors: Partial<Record<F, string>> = {};
  const formLevel: string[] = [];

  for (const [key, entries] of Object.entries(problem.errors ?? {})) {
    const message = entries[0]?.message;
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
