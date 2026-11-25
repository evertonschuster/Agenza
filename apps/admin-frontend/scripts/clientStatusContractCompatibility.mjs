const clientsStatus =
  /(^  '\/api\/v\{version\}\/clients': \{\n(?: {4}[^\n]*\n)*?    get: \{\n      parameters: \{\n        query\?: \{\n(?: {10}[^\n]*\n)*?          Status\?: )([^\n]+);$/m;
const legacyReference = "components['schemas']['ClientStatusFilter']";
const legacySchema =
  /^    \/\*\* @enum \{unknown\} \*\/\n    ClientStatusFilter: 'active' \| 'inactive' \| 'all' \| null;\n/m;
const statusUnion = "'active' | 'inactive' | 'all'";

export function normalizeClientStatusContract(types) {
  if (types.match(clientsStatus)?.[2]?.toLowerCase() !== statusUnion) return types;
  return types.replace(clientsStatus, '$1' + statusUnion + ';');
}

export function matchesClientStatusContract(committed, fresh) {
  if (
    committed.match(clientsStatus)?.[2] !== legacyReference ||
    fresh.match(clientsStatus)?.[2]?.toLowerCase() !== statusUnion ||
    !legacySchema.test(committed) ||
    committed.split(legacyReference).length !== 2
  ) {
    return false;
  }

  // The query binder ignores case and the client omits null from the query string.
  const normalizeStatus = '$1' + statusUnion + ';';
  return (
    committed.replace(clientsStatus, normalizeStatus).replace(legacySchema, '') ===
    fresh.replace(clientsStatus, normalizeStatus)
  );
}
