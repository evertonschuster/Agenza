export type ListFilterValue = string | readonly string[] | boolean | null;

export type ListFilters<F> = { [K in keyof F]: ListFilterValue };

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function writeFilter(params: URLSearchParams, name: string, value: ListFilterValue) {
  if (value === null || value === false || value === '') {
    params.delete(name);
    return;
  }

  if (value === true) {
    params.set(name, '1');
    return;
  }

  if (typeof value === 'string') {
    params.set(name, value);
    return;
  }

  if (sameValues(params.getAll(name), value)) return;

  params.delete(name);
  value.forEach((item) => params.append(name, item));
}

export function withFilters<F extends ListFilters<F>>(
  params: URLSearchParams,
  filters: F,
): URLSearchParams {
  const next = new URLSearchParams(params);

  for (const name of Object.keys(filters) as (keyof F & string)[]) {
    writeFilter(next, name, filters[name]);
  }

  return next;
}
