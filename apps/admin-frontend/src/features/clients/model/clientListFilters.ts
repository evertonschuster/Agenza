export interface ClientListFilters {
  q: string;
}

export function readClientListFilters(params: URLSearchParams): ClientListFilters {
  return { q: params.get('q') ?? '' };
}
