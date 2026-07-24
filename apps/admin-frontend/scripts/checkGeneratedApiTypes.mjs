#!/usr/bin/env node
// Contract-drift detector: regenerates the services-service OpenAPI types
// into a temp file, formats it exactly like generateApiTypes.mjs does,
// and diffs it against the committed
// src/features/catalog/infrastructure/generated/services-api.d.ts. Fails
// (non-zero exit) if they differ, so an API change that isn't followed by
// regenerating types gets caught in CI instead of silently drifting.
// Formatting before comparing matters: the raw openapi-typescript CLI
// output never matches this project's Prettier style on its own, and
// comparing it unformatted against a formatted committed file would fail
// on every run regardless of whether the contract actually changed.
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const committedPath = join(
  rootDir,
  'src/features/catalog/infrastructure/generated/services-api.d.ts',
)
const openApiUrl = process.env.SERVICES_API_OPENAPI_URL ?? 'http://localhost:5080/openapi/v1.json'

const tempDir = mkdtempSync(join(tmpdir(), 'api-types-check-'))
const tempPath = join(tempDir, 'services-api.d.ts')

try {
  execFileSync('npx', ['openapi-typescript', openApiUrl, '-o', tempPath], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  const committed = readFileSync(committedPath, 'utf8')
  const rawRegenerated = readFileSync(tempPath, 'utf8')
  const config = (await prettier.resolveConfig(committedPath)) ?? {}
  const regenerated = await prettier.format(rawRegenerated, { ...config, filepath: committedPath })

  if (committed !== regenerated) {
    console.error(
      '\nsrc/features/catalog/infrastructure/generated/services-api.d.ts is out of date with ' +
        'the live OpenAPI contract.\nRun `npm run generate:api-types --workspace=apps/admin-frontend` ' +
        'and commit the result.\n',
    )
    process.exit(1)
  }

  console.log(
    'src/features/catalog/infrastructure/generated/services-api.d.ts matches the live OpenAPI contract.',
  )
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
