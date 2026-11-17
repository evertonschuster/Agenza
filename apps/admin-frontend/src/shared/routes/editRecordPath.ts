export const EDIT_RECORD_ROUTE = ':id/editar';

export function editRecordPath(basePath: string, id: string): string {
  return `${basePath}/${EDIT_RECORD_ROUTE.replace(':id', () => id)}`;
}
