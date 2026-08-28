import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import prettier from 'prettier';

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

export async function generate() {
  const document = await fetch(new URL(OPENAPI_URL)).then((response) => response.json());
  const ast = await openapiTS(stripTenantHeaderParam(document));
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
