export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export function findTagById(tags: readonly Tag[], id: string): Tag | undefined {
  return tags.find((tag) => tag.id === id);
}
