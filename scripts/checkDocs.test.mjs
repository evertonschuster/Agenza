import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkDocumentation, entryDocuments } from './checkDocs.mjs';

const skill = '.claude/skills/agenza-example/SKILL.md';
const adrIndex = 'docs/adr/README.md';
const currentAdrs =
  '## Current decisions by concern\n\n| Concern | Current ADRs |\n| --- | --- |\n| Test | 0001 |\n';

function write(root, file, text) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}

function fixture(t, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'agenza-docs-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    rmSync(root, { recursive: true, force: true });
  });
  for (const file of entryDocuments) {
    write(root, file, '# Fixture\n');
  }
  write(root, adrIndex, currentAdrs);
  write(root, 'docs/adr/0001-test.md', '# Decision\n');
  write(
    root,
    skill,
    '---\nname: agenza-example\ndescription: Use when checking documentation.\n---\n',
  );
  for (const [file, text] of Object.entries(files)) {
    write(root, file, text);
  }
  return root;
}

test('accepts existing nested, encoded, root-relative and reference destinations', (t) => {
  const root = fixture(t, {
    'AGENTS.md':
      '[Nested\nlabel](<docs/Folder With Spaces/Guide (draft).md> "Guide")\n' +
      '[Encoded](docs/Folder%20With%20Spaces/Guide%20(draft).md#missing-anchor)\n' +
      '[Balanced](docs/guide(draft).md)\n' +
      '![Image](/docs/image.png)\n[Guide][ref]\n[ref]: docs/guide(draft).md\n',
    'docs/Folder With Spaces/Guide (draft).md': '# Guide\n',
    'docs/guide(draft).md': '# Guide\n',
    'docs/image.png': 'fixture',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('reports a deleted target with its source line and destination', (t) => {
  const root = fixture(t, {
    'AGENTS.md': '# Routes\n\n[Guide](docs/guide.md)\n',
    'docs/guide.md': '# Guide\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
  rmSync(join(root, 'docs/guide.md'));
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 3,
      message: 'Destino local ausente.',
      target: 'docs/guide.md',
    },
  ]);
});

test('ignores external links, isolated fragments, placeholders, code and comments', (t) => {
  const root = fixture(t, {
    'AGENTS.md':
      '[Web](https://example.invalid/missing) [Mail](mailto:user@example.invalid)\n' +
      '[CDN](//example.invalid/a) [Fragment](#missing) [Query](?tab=missing)\n' +
      '[Template](specs/[FEATURE]/spec.md)\n' +
      '`[Inline](missing.md)`\n<!-- [Comment](missing.md) -->\n' +
      '```md\n[Code](missing.md)\n```\n~~~md\n[Code](missing.md)\n~~~\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('checks CLAUDE imports relative to each wrapper', (t) => {
  const root = fixture(t, {
    'CLAUDE.md': '@AGENTS.md\n',
    'backend/CLAUDE.md': '@../AGENTS.md\n@AGENTS.md\n',
    'apps/admin-frontend/CLAUDE.md': '@../../AGENTS.md\n@AGENTS.md\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
  write(root, 'backend/CLAUDE.md', '@../AGENTS.md\n@missing.md\n');
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'backend/CLAUDE.md',
      line: 2,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
});

test('does not reinterpret comment delimiters inside code or code inside comments', async (t) => {
  const cases = [
    '```html\n<!--\n```\n\n[Broken](missing.md)\n\n<!-- real comment -->\n',
    '`<!--`\n\n[Broken](missing.md)\n\n<!-- real comment -->\n',
    '<!--\n```\n-->\n\n[Broken](missing.md)\n',
    '<!-- ` -->\n\n[Broken](missing.md)\n\n`real code`\n',
  ];
  for (const [index, text] of cases.entries()) {
    await t.test(`delimiter case ${index + 1}`, (context) => {
      const root = fixture(context, { 'AGENTS.md': text });
      assert.deepEqual(checkDocumentation(root).errors, [
        {
          file: 'AGENTS.md',
          line: text.slice(0, text.indexOf('[Broken]')).split('\n').length,
          message: 'Destino local ausente.',
          target: 'missing.md',
        },
      ]);
    });
  }
});

test('validates only the current ADR column, including amended references', (t) => {
  const root = fixture(t, {
    [adrIndex]:
      currentAdrs +
      '| 7777 in concern | 0001 as amended by 9999 |\n' +
      '\nHistorical note 8888.\n\n## Superseded decisions\n\n| ADR | Replaced by |\n| --- | --- |\n| 6666 | 5555 |\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: adrIndex,
      line: 6,
      message: 'ADR vigente deve corresponder a um único arquivo.',
      target: '9999',
    },
  ]);
});

test('fails if the current ADR table disappears instead of silently skipping it', (t) => {
  const root = fixture(t, { [adrIndex]: '# Index\n\n## Complete register\n0001\n' });
  assert.equal(
    checkDocumentation(root).errors[0].message,
    'Tabela de decisões vigentes não encontrada.',
  );
});

test('validates current ADR IDs formatted as inline code', (t) => {
  const root = fixture(t, { [adrIndex]: currentAdrs + '| Code | `9999` |\n' });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: adrIndex,
      line: 6,
      message: 'ADR vigente deve corresponder a um único arquivo.',
      target: '9999',
    },
  ]);
});

test('requires an unambiguous current ADR file', (t) => {
  const root = fixture(t, { 'docs/adr/0001-duplicate.md': '# Duplicate\n' });
  assert.equal(checkDocumentation(root).errors[0].target, '0001');
});

test('accepts quoted and multiline required skill metadata', (t) => {
  const root = fixture(t, {
    [skill]:
      '---\nname: "agenza-example"\ndescription: >-\n  Check links and\n  required metadata.\n---\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
  write(root, skill, '---\nname: agenza-example\ndescription: "Check # links" # note\n---\n');
  assert.deepEqual(checkDocumentation(root).errors, []);
  write(root, skill, '---\nname: 123-example\ndescription: 123 examples to check.\n---\n');
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('rejects missing, empty, non-text, duplicate and invalid skill metadata', async (t) => {
  const cases = [
    ['missing frontmatter', '# Skill\n'],
    ['missing description', '---\nname: agenza-example\n---\n'],
    ['empty description', '---\nname: agenza-example\ndescription: ""\n---\n'],
    ['comment-only description', '---\nname: agenza-example\ndescription: # No value\n---\n'],
    ['non-text description', '---\nname: agenza-example\ndescription: false\n---\n'],
    [
      'duplicate name',
      '---\nname: agenza-example\nname: duplicate\ndescription: Check links.\n---\n',
    ],
    ['invalid name', '---\nname: Invalid Name\ndescription: Check links.\n---\n'],
    ['empty block', '---\nname: agenza-example\ndescription: >\nmetadata:\n  owner: team\n---\n'],
  ];
  for (const [name, text] of cases) {
    await t.test(name, (context) => {
      const root = fixture(context, { [skill]: text });
      const errors = checkDocumentation(root).errors;
      assert.ok(errors.length > 0);
      assert.ok(errors.every((error) => error.file === skill));
    });
  }
});

test('checks skill references recursively, without scanning historical specs or adapters', (t) => {
  const root = fixture(t, {
    '.claude/skills/agenza-example/references/nested/guide.md': '[Missing](absent.md)\n',
    'apps/admin-frontend/specs/001-example/spec.md': '[Historical](missing.md)\n',
    'apps/admin-frontend/.agents/skills/agenza-example/SKILL.md': '# No metadata\n',
    'docs/adr/0001-test.md': '[Historical](missing.md)\n',
  });
  assert.equal(checkDocumentation(root).errors.length, 1);
  assert.equal(checkDocumentation(root).errors[0].target, 'absent.md');
});

test('reports a removed active document or skill entry point', (t) => {
  const root = fixture(t);
  rmSync(join(root, 'backend/AGENTS.md'));
  rmSync(join(root, skill));
  const errors = checkDocumentation(root).errors;
  assert.deepEqual(
    errors.map((error) => error.file),
    ['backend/AGENTS.md', skill],
  );
  assert.ok(errors.every((error) => error.message === 'Documento ativo ausente.'));
});

test('rejects targets outside the repository and malformed URL encoding', (t) => {
  const root = fixture(t, { 'AGENTS.md': '[Outside](../missing.md)\n[Encoding](broken%ZZ.md)\n' });
  assert.deepEqual(
    checkDocumentation(root).errors.map((error) => error.message),
    ['Destino fora do repositório.', 'Destino com codificação inválida.'],
  );
});

test('CLI exits nonzero for broken references and leaves its checkout unchanged', (t) => {
  const root = fixture(t, { 'AGENTS.md': '# Guide\n[Broken](missing.md)\n' });
  const script = join(root, 'scripts/checkDocs.mjs');
  mkdirSync(dirname(script), { recursive: true });
  copyFileSync(fileURLToPath(new URL('./checkDocs.mjs', import.meta.url)), script);
  const before = readdirSync(root, { recursive: true })
    .sort()
    .map((file) => [file, file.endsWith('.md') ? readFileSync(join(root, file), 'utf8') : '']);
  const run = spawnSync(process.execPath, [script], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /AGENTS\.md:2: Destino local ausente\. \[missing\.md\]/);
  assert.deepEqual(
    readdirSync(root, { recursive: true })
      .sort()
      .map((file) => [file, file.endsWith('.md') ? readFileSync(join(root, file), 'utf8') : '']),
    before,
  );
});
