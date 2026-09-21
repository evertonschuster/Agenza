import type { LucideIcon } from 'lucide-react';
import { CalendarDays, Home, MessageCircle, Settings, Tag, Users, Wrench } from 'lucide-react';

export interface NavDestination {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon: boolean;
}

export const NAV_DESTINATIONS: NavDestination[] = [
  { label: 'Início', href: '/', icon: Home, comingSoon: false },
  { label: 'Agenda', href: '/agenda', icon: CalendarDays, comingSoon: true },
  { label: 'Clientes', href: '/clientes', icon: Users, comingSoon: true },
  { label: 'Conversas', href: '/conversas', icon: MessageCircle, comingSoon: true },
  { label: 'Serviços', href: '/servicos', icon: Wrench, comingSoon: false },
  { label: 'Etiquetas', href: '/tags', icon: Tag, comingSoon: false },
  { label: 'Ajustes', href: '/ajustes', icon: Settings, comingSoon: true },
];
