import { Badge } from '@/shared/ui/badge';
import { CLIENT_STATUS_LABELS, type ClientStatus } from '../../model/clientStatus';

const STATUS_BADGE_VARIANT: Record<ClientStatus, 'success' | 'muted'> = {
  active: 'success',
  inactive: 'muted',
};

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string | undefined;
}

function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} className={className}>
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export { ClientStatusBadge };
