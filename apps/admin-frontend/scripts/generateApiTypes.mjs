import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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

export async function generate() {
  const ast = await openapiTS(new URL(OPENAPI_URL));
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const content = await generate();
  await writeFile(OUTPUT_PATH, content, 'utf-8');
  console.log(`Generated ${OUTPUT_PATH} from ${OPENAPI_URL}`);
}
