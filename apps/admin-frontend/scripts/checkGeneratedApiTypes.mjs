import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from './generateApiTypes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMITTED_PATH = path.join(
  __dirname,
  '..',
  'src',
  'shared',
  'api',
  'generated',
  'services-api.d.ts',
);

const fresh = await generate();
const committed = await readFile(COMMITTED_PATH, 'utf-8');

if (fresh !== committed) {
  const dir = await mkdtemp(path.join(tmpdir(), 'services-api-drift-'));
  const tempPath = path.join(dir, 'services-api.d.ts');
  await writeFile(tempPath, fresh, 'utf-8');
  console.error(
    `Drift detected between ${COMMITTED_PATH} and the live OpenAPI document.\n` +
      `Freshly generated output was written to ${tempPath} for comparison.\n` +
      'Run `npm run generate:api-types` and commit the result.',
  );
  await rm(dir, { recursive: true, force: true });
  process.exit(1);
}

console.log('services-api.d.ts is up to date with the live OpenAPI document.');
