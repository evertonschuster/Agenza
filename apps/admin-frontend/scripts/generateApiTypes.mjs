import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import prettier from 'prettier';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'shared',
  'api',
  'generated',
  'services-api.d.ts',
);
const OPENAPI_URL = process.env.SERVICES_API_OPENAPI_URL ?? 'http://localhost:5080/openapi/v1.json';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

// The X-Tenant-Id header is attached by createApiClient's middleware from the auth session, not by
// call sites — drop it from the generated types so repositories never have to pass a placeholder.
function stripTenantHeaderParam(document) {
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!Array.isArray(operation?.parameters)) continue;
      operation.parameters = operation.parameters.filter(
        (parameter) => !(parameter.in === 'header' && parameter.name === 'X-Tenant-Id'),
      );
    }
  }
  return document;
}

const SCHEMA_REF = '#/components/schemas/';

function schemaRefsIn(value, refs = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) schemaRefsIn(item, refs);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string' && item.startsWith(SCHEMA_REF)) {
        refs.add(item.slice(SCHEMA_REF.length));
      } else {
        schemaRefsIn(item, refs);
      }
    }
  }
  return refs;
}

function reachableSchemas(document, roots) {
  const reached = new Set();
  const pending = [...schemaRefsIn(roots)];
  while (pending.length > 0) {
    const name = pending.pop();
    if (reached.has(name)) continue;
    reached.add(name);
    pending.push(...schemaRefsIn(document.components?.schemas?.[name]));
  }
  return reached;
}

function requestBodyOnlySchemas(document) {
  const operations = Object.values(document.paths ?? {}).flatMap((pathItem) =>
    HTTP_METHODS.map((method) => pathItem[method]).filter(Boolean),
  );
  const sent = reachableSchemas(
    document,
    operations.map((operation) => operation.requestBody),
  );
  const usedElsewhere = reachableSchemas(
    document,
    operations.map(({ requestBody: _requestBody, ...rest }) => rest),
  );
  return new Set([...sent].filter((name) => !usedElsewhere.has(name)));
}

function requestDateAsDate(requestOnly) {
  return (schemaObject, { path: schemaPath = '' }) => {
    const schemaName = schemaPath.startsWith(SCHEMA_REF)
      ? schemaPath.slice(SCHEMA_REF.length).split('/')[0]
      : undefined;
    if (schemaObject.format !== 'date' || !requestOnly.has(schemaName)) return undefined;

    const date = ts.factory.createTypeReferenceNode('Date');
    if (!Array.isArray(schemaObject.type) || !schemaObject.type.includes('null')) return date;

    return ts.factory.createUnionTypeNode([
      ts.factory.createLiteralTypeNode(ts.factory.createNull()),
      date,
    ]);
  };
}

export async function generate() {
  const document = stripTenantHeaderParam(
    await fetch(new URL(OPENAPI_URL)).then((response) => response.json()),
  );
  const ast = await openapiTS(document, {
    transform: requestDateAsDate(requestBodyOnlySchemas(document)),
  });
  const raw = astToString(ast);
  const prettierConfig = (await prettier.resolveConfig(__dirname)) ?? {};
  const formatted = await prettier.format(raw, { ...prettierConfig, parser: 'typescript' });
  const banner =
    '/**\n' +
    ' * GENERATED FILE — do not hand-edit. Regenerate with `npm run generate:api-types`.\n' +
    ' * Source: ' +
    OPENAPI_URL +
    '\n' +
    ' */\n\n';
  return banner + formatted;
}

// String-concatenating `file://` breaks on Windows (backslashes, drive-letter encoding) —
// pathToFileURL() normalizes both sides so this entry-point check works cross-platform.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const content = await generate();
  await writeFile(OUTPUT_PATH, content, 'utf-8');
  console.log(`Generated ${OUTPUT_PATH} from ${OPENAPI_URL}`);
}
