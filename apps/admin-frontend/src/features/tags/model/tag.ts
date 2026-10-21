export const TAG_NAME_MAX_LENGTH = 40;
export const TAG_DESCRIPTION_MAX_LENGTH = 200;
export const TAG_SEARCH_MAX_LENGTH = 254;

export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export type TagInput = Pick<Tag, 'name' | 'color' | 'description'>;
