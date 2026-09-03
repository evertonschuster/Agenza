import type { FormEvent } from 'react';
import { useNavigation, useSubmit } from 'react-router';
import { Button } from '@/shared/ui/button';
import type { Category } from '../../../model/category';
import { useCategoriesPage } from './useCategoriesPage';

export function CategoriesForm({ categories }: { categories: Category[] }) {
  const { newName, setNewName, editing, setEditing } = useCategoriesPage();
  const navigation = useNavigation();
  const submit = useSubmit();

  const busy = navigation.state !== 'idle';

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    void submit({ name: newName.trim() }, { method: 'post' });
  };

  const saveEdit = () => {
    if (busy || !editing) return;
    void submit({ id: editing.id, name: editing.name.trim() }, { method: 'post' });
  };

  return (
    <>
      <form className="flex gap-2" onSubmit={create}>
        <input
          className="flex-1 rounded border px-2 py-1 text-sm"
          aria-label="Nova categoria"
          placeholder="Nova categoria"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
          Criar
        </Button>
      </form>

      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-2">
            {editing?.id === category.id ? (
              <>
                <input
                  className="flex-1 rounded border px-2 py-1 text-sm"
                  aria-label="Nome da categoria"
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
                <Button
                  size="sm"
                  disabled={busy || !editing.name.trim()}
                  onClick={() => saveEdit()}
                >
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{category.name}</span>
                <Button size="sm" variant="outline" onClick={() => setEditing(category)}>
                  Editar
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
