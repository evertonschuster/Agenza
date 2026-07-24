#!/usr/bin/env node
// Regenerates the services-service OpenAPI types and writes them through
// Prettier before saving. `.prettierignore` excludes this generated file
// from repo-wide `prettier --write .` runs (never hand-reformat generated
// code), but that also means the raw openapi-typescript CLI output
// (double quotes, semicolons, 4-space indent) never matches this
// project's style on its own - formatting it here, once, at generation
// time keeps the committed file's byte content deterministic and
// reproducible directly from this script, matching exactly what
// checkGeneratedApiTypes.mjs compares against.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const targetPath = join(rootDir, 'src/features/catalog/infrastructure/generated/services-api.d.ts')
const openApiUrl = process.env.SERVICES_API_OPENAPI_URL ?? 'http://localhost:5080/openapi/v1.json'

const tempDir = mkdtempSync(join(tmpdir(), 'api-types-generate-'))
const tempPath = join(tempDir, 'services-api.d.ts')

try {
  execFileSync('npx', ['openapi-typescript', openApiUrl, '-o', tempPath], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  const raw = readFileSync(tempPath, 'utf8')
  const config = (await prettier.resolveConfig(targetPath)) ?? {}
  const formatted = await prettier.format(raw, { ...config, filepath: targetPath })

  writeFileSync(targetPath, formatted)
  console.log('src/features/catalog/infrastructure/generated/services-api.d.ts written.')
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
