import type { Tag } from '../../../model/tag';

export interface TagCreationDialogProps {
  readonly name: string;
  readonly onCreated: (tag: Tag) => void;
  readonly onCancel: () => void;
  readonly finalFocus?: (() => HTMLElement | null) | undefined;
}
