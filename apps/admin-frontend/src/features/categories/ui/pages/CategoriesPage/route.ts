import { redirect, type ActionFunctionArgs } from 'react-router';
import { unwrapOrThrow } from '@/shared/api/unwrap';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { categoryRepository } from '../../../api/categoryRepository';
import type { Category } from '../../../model/category';

export async function categoriesLoader(): Promise<Category[]> {
  return unwrapOrThrow(await categoryRepository.list());
}

export async function categoriesAction({
  request,
}: ActionFunctionArgs): Promise<ApiProblem | Response> {
  const form = await request.formData();
  const nameField = form.get('name');
  const name = typeof nameField === 'string' ? nameField.trim() : '';
  const idField = form.get('id');

  const result =
    typeof idField === 'string' && idField.length > 0
      ? await categoryRepository.update(idField, name)
      : await categoryRepository.create(name);

  return result.ok ? redirect('/categories') : result.error;
}
