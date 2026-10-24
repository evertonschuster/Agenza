import type { ClientStatus } from '../../model/clientStatus';

export interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string | undefined;
}
