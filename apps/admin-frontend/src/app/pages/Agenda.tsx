import { CalendarDays } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function Agenda() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Agenda"
      description="Sua agenda de horários mora aqui: o dia inteiro, marcar e remarcar atendimentos, sem sair do painel."
    />
  );
}
