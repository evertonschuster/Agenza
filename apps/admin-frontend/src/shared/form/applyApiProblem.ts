import type { FieldError, FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { toFormErrors, type FormFieldError } from '@/shared/api/formErrors';

export type ApiFormFieldError = FieldError & Pick<FormFieldError, 'meta'>;

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

export function applyApiProblem<T extends FieldValues>(
  problem: ApiProblem,
  methods: Pick<UseFormReturn<T>, 'setError' | 'setFocus'> & { getValues: () => T },
): void {
  const fields = fieldPathsOf(methods.getValues()) as Path<T>[];
  const { fieldErrors, formError } = toFormErrors(problem, fields);

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
