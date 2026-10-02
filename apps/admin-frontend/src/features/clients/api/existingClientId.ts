import type { ApiProblem } from '@/shared/api/servicesFacade';

const DUPLICATE_CPF_CODE = 'Client.DuplicateCpf';
const CPF_FIELD = 'cpf';
const CLIENT_ID_KEY = 'clientId';

export function existingClientIdFrom(problem: ApiProblem): string | null {
  for (const [field, errors] of Object.entries(problem.errors ?? {})) {
    if (field.toLowerCase() !== CPF_FIELD) continue;

    const conflict = errors.find((error) => error.code === DUPLICATE_CPF_CODE);
    return conflict?.meta?.[CLIENT_ID_KEY] ?? null;
  }

  return null;
}
