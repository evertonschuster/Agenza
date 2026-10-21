import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { toFormErrors } from '@/shared/api/formErrors';

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
    const message = fieldErrors[field];
    if (message) methods.setError(field, { type: 'server', message });
  }
  if (formError) {
    methods.setError('root.serverError', { type: problem.code ?? 'server', message: formError });
  }

  const firstInvalid = fields.find((field) => fieldErrors[field]);
  if (firstInvalid) methods.setFocus(firstInvalid);
}
