export type ClientStatus = 'active' | 'inactive';

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
};

export function toClientStatus(value: string): ClientStatus {
  return value === 'inactive' ? 'inactive' : 'active';
}
