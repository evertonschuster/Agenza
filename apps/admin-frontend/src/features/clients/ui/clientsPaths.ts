export const CLIENTS_PATH = '/pessoas';
export const NEW_CLIENT_PATH = `${CLIENTS_PATH}/nova`;

export function editClientPath(id: string): string {
  return `${CLIENTS_PATH}/${id}/editar`;
}
