import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { toFormErrors } from '@/shared/api/formErrors';

export function applyApiProblem<T extends FieldValues>(
  problem: ApiProblem,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): void {
  const { fieldErrors, formError } = toFormErrors(problem, fields);
  for (const field of fields) {
    const message = fieldErrors[field];
    if (message) setError(field, { type: 'server', message });
  }
  if (formError) setError('root.serverError', { type: 'server', message: formError });
}
