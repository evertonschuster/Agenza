import { useLoaderData, useLocation, useNavigate } from 'react-router';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { useShortcutHint } from '@/shared/keyboard/shortcuts';
import type { ListSectionStatus } from '@/shared/ui/list-section';
import type { Tag } from '../../../model/tag';
import type { TagListLoaderData } from './route';

interface UseTagListPageResult {
  status: ListSectionStatus;
  tags: Tag[];
  query: string;
  newTagHref: { pathname: string; search: string };
  newTagHint: ReturnType<typeof useShortcutHint>;
}

export function useTagListPage(): UseTagListPageResult {
  const data = useLoaderData<TagListLoaderData>();
  const location = useLocation();
  const navigate = useNavigate();

  const newTagHref = { pathname: 'new', search: location.search };
  const newTagHint = useShortcutHint('nova-etiqueta');
  useShortcut('nova-etiqueta', 'n', 'Nova etiqueta', () => void navigate(newTagHref));

  return {
    status: data.status,
    tags: data.status === 'ready' ? data.tags : [],
    query: data.query,
    newTagHref,
    newTagHint,
  };
}
