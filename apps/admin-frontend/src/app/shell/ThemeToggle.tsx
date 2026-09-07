import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
        <DropdownMenuRadioGroup value={choice} onValueChange={setTheme}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.choice} value={option.choice} closeOnClick>
              <option.icon aria-hidden="true" />
              <span>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
