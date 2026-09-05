import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useTheme } from '@/shared/theme/useTheme';
import type { ThemeChoice } from '@/shared/theme/theme';

const OPTIONS: { choice: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { choice: 'light', label: 'Claro', icon: Sun },
  { choice: 'dark', label: 'Escuro', icon: Moon },
  { choice: 'system', label: 'Automático', icon: Monitor },
];

export function ThemeToggle() {
  const { choice, resolved, setTheme } = useTheme();
  const ActiveIcon = resolved === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Alternar tema" />}
      >
        <ActiveIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.choice} onClick={() => setTheme(option.choice)}>
            <option.icon aria-hidden="true" />
            <span>{option.label}</span>
            {choice === option.choice && <Check className="ml-auto" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
