import { useState } from 'react';
import { formatShortcutKey, useShortcutList } from '@/shared/keyboard/shortcuts';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { Kbd } from '@/shared/ui/kbd';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet';

export function ShortcutHelpSheet() {
  const [open, setOpen] = useState(false);
  const shortcuts = useShortcutList();

  useShortcut('shortcut-help', '?', 'Abrir a ajuda de atalhos', () => setOpen(true));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Atalhos de teclado</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
          <ul className="flex flex-col gap-2.5">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{shortcut.description}</span>
                <Kbd>{formatShortcutKey(shortcut)}</Kbd>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Fechar diálogo, folha ou paleta</span>
              <Kbd>Esc</Kbd>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
