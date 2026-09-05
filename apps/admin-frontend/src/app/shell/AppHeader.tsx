import { LogOut, Search } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { shortcutRegistry, useShortcutHint } from '@/shared/keyboard/shortcuts';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Kbd } from '@/shared/ui/kbd';
import { ThemeToggle } from './ThemeToggle';

function initialsOf(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const searchHint = useShortcutHint('command-palette-slash');

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <Button
        variant="outline"
        aria-keyshortcuts={searchHint.key}
        className="min-w-0 flex-1 justify-start text-muted-foreground sm:max-w-64"
        onClick={() => shortcutRegistry.getShortcut('command-palette-slash')?.handler()}
      >
        <Search aria-hidden="true" />
        <span>Buscar</span>
        {searchHint.visible && <Kbd className="ml-auto">{searchHint.displayKey}</Kbd>}
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="Menu da conta" />}
          >
            <Avatar size="sm">
              <AvatarFallback>{initialsOf(user?.displayName ?? null)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user?.displayName && (
              <DropdownMenuGroup>
                <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
              </DropdownMenuGroup>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
              <LogOut aria-hidden="true" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
