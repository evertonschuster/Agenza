import type { Tag } from '../../../model/tag';

export interface TagCreateDialogProps {
  readonly name: string;
  readonly onCreated: (tag: Tag) => void;
  readonly onCancel: () => void;
  readonly finalFocus?: (() => HTMLElement | null) | undefined;
}
