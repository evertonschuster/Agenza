import { Button } from '@/shared/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';

/** The empty authenticated shell: layout + placeholder navigation (spec FR-004, FR-013). */
export function AppLayout() {
  const { tenant, user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">Agenza Admin</span>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {user?.displayName ? <span>{user.displayName}</span> : null}
          {tenant ? <span data-testid="tenant-id">{tenant.tenantId}</span> : null}
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </header>
      <div className="flex flex-1">
        <nav className="w-56 border-r px-4 py-6">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Dashboard</li>
          </ul>
        </nav>
        <main className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">No business features yet (spec FR-013).</p>
        </main>
      </div>
    </div>
  );
}
