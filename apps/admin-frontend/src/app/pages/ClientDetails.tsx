import { Users } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function ClientDetails() {
  return (
    <ComingSoon
      icon={Users}
      title="Detalhes da pessoa"
      description="Os dados, os responsáveis e as pessoas de referência de cada pessoa atendida vão aparecer aqui."
    />
  );
}
