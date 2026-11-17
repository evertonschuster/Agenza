export interface RelatedRecord {
  id?: string;
  name: string;
}

export interface RelatedRecordGroup {
  key: string;
  title: string;
  items: readonly RelatedRecord[];
  description?: string;
  basePath?: string;
}
