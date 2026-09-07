import { MessageCircle } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function Conversations() {
  return (
    <ComingSoon
      icon={MessageCircle}
      title="Conversas"
      description="As conversas com clientes — WhatsApp e outros canais — vão aparecer aqui, num só lugar."
    />
  );
}
