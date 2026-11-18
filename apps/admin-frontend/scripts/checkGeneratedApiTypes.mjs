import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generate, TYPES_PATH } from './generateApiTypes.mjs';
import { matchesClientStatusContract } from './clientStatusContractCompatibility.mjs';

let drifted = false;
for (const [committedPath, fresh] of Object.entries(await generate())) {
  const committed = await readFile(committedPath, 'utf-8').catch(() => '');
  if (fresh === committed) continue;
  if (committedPath === TYPES_PATH && matchesClientStatusContract(committed, fresh)) continue;

  drifted = true;
  const dir = await mkdtemp(path.join(tmpdir(), 'services-api-drift-'));
  const tempPath = path.join(dir, path.basename(committedPath));
  await writeFile(tempPath, fresh, 'utf-8');
  console.error(
    `Drift detected between ${committedPath} and the live OpenAPI document.\n` +
      `Freshly generated output was written to ${tempPath} for comparison.\n` +
      'Run `npm run generate:api-types` and commit the result.',
  );
  await rm(dir, { recursive: true, force: true });
}

if (drifted) process.exit(1);

console.log('The generated API files match the live OpenAPI contract.');
