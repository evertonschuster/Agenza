import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';
import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';
import { settle } from '@/shared/api/settle';
import { categoryRepository, type Category } from '../infrastructure/categoryRepository';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const result = await settle(categoryRepository.list());
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

  const mutate = async <T,>(op: () => Promise<ApiResult<T>>, onOk: () => void) => {
    if (busy) return;
    setBusy(true);
    const result = await settle(op());
    if (result.ok) {
      onOk();
      await load();
    } else {
      setProblem(result.error);
    }
    setBusy(false);
  };

  const create = () =>
    void mutate(
      () => categoryRepository.create(newName.trim()),
      () => setNewName(''),
    );

  const saveEdit = () => {
    if (!editing) return;
    const { id, name } = editing;
    void mutate(
      () => categoryRepository.update(id, name.trim()),
      () => setEditing(null),
    );
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
          create();
        }}
      >
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
      )}
    </section>
  );
}
