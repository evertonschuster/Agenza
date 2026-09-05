import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { HelpCircle, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/shared/theme/useTheme';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import {
  Combobox,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxPaletteContent,
} from '@/shared/ui/combobox';
import { NAV_DESTINATIONS } from './navigation';

interface Command {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { logout } = useAuth();

  useShortcut('command-palette-mod-k', 'k', 'Abrir a paleta de comandos', () => setOpen(true), {
    modified: true,
  });
  useShortcut('command-palette-slash', '/', 'Abrir a paleta de comandos', () => setOpen(true));

  const groups: { label: string; commands: Command[] }[] = [
    {
      label: 'Ir para',
      commands: NAV_DESTINATIONS.map((destination) => ({
        id: `nav-${destination.href}`,
        label: destination.label,
        icon: destination.icon,
        run: () => navigate(destination.href),
      })),
    },
    {
      label: 'Tema',
      commands: [
        { id: 'theme-light', label: 'Tema claro', icon: Sun, run: () => setTheme('light') },
        { id: 'theme-dark', label: 'Tema escuro', icon: Moon, run: () => setTheme('dark') },
        {
          id: 'theme-system',
          label: 'Tema automático',
          icon: Monitor,
          run: () => setTheme('system'),
        },
      ],
    },
    {
      label: 'Outros',
      commands: [
        {
          id: 'help',
          label: 'Abrir ajuda',
          icon: HelpCircle,
          run: () => shortcutRegistry.getShortcut('shortcut-help')?.handler(),
        },
        { id: 'logout', label: 'Sair', icon: LogOut, run: () => void logout() },
      ],
    },
  ];

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = normalizedQuery
    ? groups
        .map((group) => ({
          ...group,
          commands: group.commands.filter((command) =>
            command.label.toLowerCase().includes(normalizedQuery),
          ),
        }))
        .filter((group) => group.commands.length > 0)
    : groups;

  return (
    <Combobox
      open={open}
      onOpenChange={setOpen}
      value={null}
      onValueChange={(id: string | null) => {
        const command = groups.flatMap((group) => group.commands).find((c) => c.id === id);
        setOpen(false);
        setQuery('');
        command?.run();
      }}
      inputValue={query}
      onInputValueChange={setQuery}
    >
      <ComboboxPaletteContent aria-label="Paleta de comandos">
        <ComboboxInput
          placeholder="Buscar destinos e comandos..."
          showTrigger={false}
          className="rounded-none border-x-0 border-t-0"
        />
        <ComboboxEmpty className="p-4">Nada encontrado.</ComboboxEmpty>
        <ComboboxList className="flex-1 p-2">
          {filteredGroups.map((group) => (
            <ComboboxGroup key={group.label}>
              <ComboboxLabel>{group.label}</ComboboxLabel>
              {group.commands.map((command) => (
                <ComboboxItem key={command.id} value={command.id}>
                  <command.icon aria-hidden="true" />
                  <span>{command.label}</span>
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          ))}
        </ComboboxList>
      </ComboboxPaletteContent>
    </Combobox>
  );
}
