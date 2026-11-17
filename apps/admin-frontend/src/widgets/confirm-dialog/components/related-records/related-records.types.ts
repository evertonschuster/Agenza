import type { ReactNode } from 'react';

export interface RelatedRecord {
  id?: string;
  name: string;
}

export interface RelatedRecordGroup {
  key: string;
  title: string;
  items: readonly RelatedRecord[];
  description?: ReactNode;
  getEditPath?: (record: RelatedRecord) => string | undefined;
}
