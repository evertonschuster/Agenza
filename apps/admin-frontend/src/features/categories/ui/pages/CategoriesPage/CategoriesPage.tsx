import { useActionData, useLoaderData, useLocation } from 'react-router';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import type { Category } from '../../../model/category';
import { CategoriesForm } from './CategoriesForm';

export function CategoriesPage() {
  const categories = useLoaderData<Category[]>();
  const problem = useActionData<ApiProblem | null>();
  const location = useLocation();

  return (
    <section className="max-w-lg space-y-6">
      <h1 className="text-lg font-semibold">Categorias</h1>

      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {problem.title ?? 'Algo deu errado.'}
          {problem.code ? <span className="text-muted-foreground"> ({problem.code})</span> : null}
        </p>
      ) : null}

      <CategoriesForm key={location.key} categories={categories} />
    </section>
  );
}
