import { Outlet } from 'react-router';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { CommandPalette } from './CommandPalette';
import { ShortcutHelpSheet } from './ShortcutHelpSheet';
import { SidebarNav } from './SidebarNav';
import { useRouteScrollReset } from './useRouteScrollReset';
import { useViewportKind } from './useViewportKind';

export function AppShell() {
  const viewportKind = useViewportKind();
  const mainRef = useRouteScrollReset<HTMLElement>();

  return (
    <div className="flex h-dvh min-h-0 flex-col md:flex-row">
      {viewportKind !== 'bottom' && <SidebarNav compact={viewportKind === 'rail'} />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader />
        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-contain p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
      </div>

      {viewportKind === 'bottom' && <BottomNav />}
      <CommandPalette />
      <ShortcutHelpSheet />
    </div>
  );
}
