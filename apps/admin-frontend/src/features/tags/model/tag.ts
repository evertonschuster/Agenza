export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export type TagInput = Pick<Tag, 'name' | 'color' | 'description'>;
