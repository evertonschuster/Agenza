export type ClientStatus = 'active' | 'inactive';

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
};
