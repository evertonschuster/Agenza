import type { FieldError, FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { toFormErrors, type FormFieldError } from '@/shared/api/formErrors';

export type ApiFormFieldError = FieldError & Pick<FormFieldError, 'meta'>;

export type FieldAliases<T extends FieldValues> = Readonly<Record<string, Path<T>>>;

export interface ApiProblemTarget<T extends FieldValues> {
  problem: ApiProblem;
  methods: Pick<UseFormReturn<T>, 'setError' | 'setFocus'> & { getValues: () => T };
  aliases?: FieldAliases<T> | undefined;
}

function fieldPathsOf(values: unknown, prefix = ''): string[] {
  if (
    values === null ||
    typeof values !== 'object' ||
    (!Array.isArray(values) && Object.getPrototypeOf(values) !== Object.prototype)
  ) {
    return [];
  }

  return Object.entries(values).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...fieldPathsOf(value, path)];
  });
}

function aliasedField(key: string, aliases: Readonly<Record<string, string>>): string | undefined {
  const submitted = key.replace(/[.[].*/, '').toLowerCase();
  return Object.entries(aliases).find(([name]) => name.toLowerCase() === submitted)?.[1];
}

function withAliases(problem: ApiProblem, aliases: Readonly<Record<string, string>>): ApiProblem {
  if (!problem.errors) return problem;
  const errors: NonNullable<ApiProblem['errors']> = {};
  for (const [key, entries] of Object.entries(problem.errors)) {
    const field = aliasedField(key, aliases) ?? key;
    errors[field] = [...(errors[field] ?? []), ...entries];
  }
  return { ...problem, errors };
}

export function applyApiProblem<T extends FieldValues>(target: ApiProblemTarget<T>): void {
  const { problem, methods, aliases = {} } = target;
  const fields = fieldPathsOf(methods.getValues()) as Path<T>[];
  const { fieldErrors, formError } = toFormErrors(withAliases(problem, aliases), fields);

  for (const field of fields) {
    const fieldError = fieldErrors[field];
    if (fieldError) {
      const { code, ...details } = fieldError;
      methods.setError(field, { ...details, type: code ?? 'server' });
    }
  }
  if (formError) {
    methods.setError('root.serverError', { type: problem.code ?? 'server', message: formError });
  }

  const firstInvalid = fields.find((field) => fieldErrors[field]);
  if (firstInvalid) methods.setFocus(firstInvalid);
}
