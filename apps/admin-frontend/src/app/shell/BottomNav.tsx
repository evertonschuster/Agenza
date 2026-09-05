import { useState } from 'react';
import { NavLink } from 'react-router';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { NAV_DESTINATIONS } from './navigation';

const PRIMARY_HREFS = ['/', '/agenda', '/clientes', '/servicos'];

const TAB_CLASS =
  'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs text-muted-foreground';

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = NAV_DESTINATIONS.filter((destination) =>
    PRIMARY_HREFS.includes(destination.href),
  );
  const overflow = NAV_DESTINATIONS.filter(
    (destination) => !PRIMARY_HREFS.includes(destination.href),
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {primary.map((destination) => (
        <NavLink
          key={destination.href}
          to={destination.href}
          className={({ isActive }) => cn(TAB_CLASS, isActive && 'text-foreground')}
        >
          <span className="relative">
            <destination.icon className="size-5" aria-hidden="true" />
            {destination.comingSoon && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-muted-foreground"
              />
            )}
          </span>
          <span>
            {destination.comingSoon ? `${destination.label} (em breve)` : destination.label}
          </span>
        </NavLink>
      ))}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger className={TAB_CLASS}>
          <MoreHorizontal className="size-5" aria-hidden="true" />
          <span>Mais</span>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Mais opções</SheetTitle>
          </SheetHeader>
          <nav aria-label="Mais destinos" className="flex flex-col gap-1 p-4 pt-0">
            {overflow.map((destination) => (
              <NavLink
                key={destination.href}
                to={destination.href}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-foreground',
                  )
                }
              >
                <destination.icon className="size-5 shrink-0" aria-hidden="true" />
                <span>
                  {destination.comingSoon ? `${destination.label} (em breve)` : destination.label}
                </span>
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
