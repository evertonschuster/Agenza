import { useState } from 'react';
import type { Category } from '../../../model/category';

export function useCategoriesPage() {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);

  return { newName, setNewName, editing, setEditing };
}
