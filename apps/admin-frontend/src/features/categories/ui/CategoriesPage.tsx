import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';
import { settle, useApiResource } from '@/shared/api/apiResource';
import { categoryRepository, type Category } from '../infrastructure/categoryRepository';

export function CategoriesPage() {
  const categories = useApiResource(() => categoryRepository.list());

  const [busy, setBusy] = useState(false);
  const [mutationProblem, setMutationProblem] = useState<ApiProblem | null>(null);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);

  const problem = mutationProblem ?? categories.problem;

  const mutate = async <T,>(op: () => Promise<ApiResult<T>>, onOk: () => void) => {
    if (busy) return;
    setBusy(true);
    const result = await settle(op());
    if (result.ok) {
      setMutationProblem(null);
      onOk();
      categories.reload();
    } else {
      setMutationProblem(result.error);
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

      {categories.loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="space-y-2">
          {(categories.data ?? []).map((category) => (
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
