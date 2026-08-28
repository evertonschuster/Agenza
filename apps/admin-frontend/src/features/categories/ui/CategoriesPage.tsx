import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { categoryRepository, type Category } from '../infrastructure/categoryRepository';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const result = await categoryRepository.list();
    if (result.ok) {
      setCategories(result.data);
      setProblem(null);
    } else {
      setProblem(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; a route loader / query lib comes later
    void load();
  }, [load]);

  const create = async () => {
    const result = await categoryRepository.create(newName.trim());
    if (result.ok) {
      setNewName('');
      void load();
    } else {
      setProblem(result.error);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const result = await categoryRepository.update(editing.id, editing.name.trim());
    if (result.ok) {
      setEditing(null);
      void load();
    } else {
      setProblem(result.error);
    }
  };

  return (
    <section className="max-w-lg space-y-6">
      <h1 className="text-lg font-semibold">Categorias</h1>

      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {problem.title} <span className="text-muted-foreground">({problem.code})</span>
        </p>
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <input
          className="flex-1 rounded border px-2 py-1 text-sm"
          placeholder="Nova categoria"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={!newName.trim()}>
          Criar
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2">
              {editing?.id === category.id ? (
                <>
                  <input
                    className="flex-1 rounded border px-2 py-1 text-sm"
                    value={editing.name}
                    onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  />
                  <Button size="sm" disabled={!editing.name.trim()} onClick={() => void saveEdit()}>
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
      )}
    </section>
  );
}
