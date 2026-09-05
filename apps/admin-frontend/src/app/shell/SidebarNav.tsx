import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { NAV_DESTINATIONS } from './navigation';

const BASE_LINK =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
const ACTIVE_LINK = 'bg-sidebar-accent font-medium text-sidebar-accent-foreground';

export function SidebarNav({ compact }: { compact: boolean }) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col',
        compact ? 'md:w-16' : 'md:w-60',
      )}
    >
      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1 p-2">
        {NAV_DESTINATIONS.map((destination) => {
          const label = destination.comingSoon
            ? `${destination.label} (em breve)`
            : destination.label;
          const content = (
            <>
              <destination.icon className="size-5 shrink-0" aria-hidden="true" />
              <span className={compact ? 'sr-only' : 'truncate'}>{label}</span>
            </>
          );

          if (compact) {
            return (
              <Tooltip key={destination.href}>
                <TooltipTrigger
                  render={
                    <NavLink
                      to={destination.href}
                      className={({ isActive }) =>
                        cn(BASE_LINK, 'justify-center', isActive && ACTIVE_LINK)
                      }
                    />
                  }
                >
                  {content}
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <NavLink
              key={destination.href}
              to={destination.href}
              className={({ isActive }) => cn(BASE_LINK, isActive && ACTIVE_LINK)}
            >
              {content}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
