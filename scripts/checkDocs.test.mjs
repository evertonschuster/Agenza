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
  write(root, 'docs/decisions/0001-test.md', '# Decision\n');
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
      '[Template](docs/[FEATURE]/notes.md)\n' +
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

test('checks links inside decision records', (t) => {
  const root = fixture(t, { 'docs/decisions/0001-test.md': '[Guide](../missing.md)\n' });
  assert.deepEqual(
    checkDocumentation(root).errors.map(({ file, target }) => ({ file, target })),
    [{ file: 'docs/decisions/0001-test.md', target: '../missing.md' }],
  );
});

test('checks skill references recursively, without scanning unlisted documents', (t) => {
  const root = fixture(t, {
    '.claude/skills/agenza-example/references/nested/guide.md': '[Missing](absent.md)\n',
    'docs/notes/draft.md': '[Draft](missing.md)\n',
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

test('ignores blockquote fences while checking prose after the blockquote', async (t) => {
  const cases = [
    '> ~~~md\n> [Example](missing-example.md)\n> ~~~\n\n[Broken](missing.md)\n',
    '> ~~~md\n> [Example](missing-example.md)\n\n[Broken](missing.md)\n',
  ];
  for (const [index, text] of cases.entries()) {
    await t.test(`blockquote case ${index + 1}`, (context) => {
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

test('does not close an inline code span across a paragraph boundary', (t) => {
  const root = fixture(t, {
    'AGENTS.md': 'A stray ` marker.\n\n[Broken](missing.md)\n\nA later ` marker.\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 3,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
});

test('checks prose after a line beginning with a triple-backtick code span', (t) => {
  const root = fixture(t, {
    'AGENTS.md': '```[Example](ignored.md)```\n\n[Broken](missing.md)\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 3,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
});

test('ignores escaped opening backticks and keeps backslashes literal inside code spans', (t) => {
  const root = fixture(t, {
    'AGENTS.md': '\\` [Broken](missing.md) `\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 1,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
  write(root, 'AGENTS.md', '`Example\\` [Broken](missing.md)\n');
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 1,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
});

test('distinguishes an escaped opening bracket from a link after an escaped backslash', (t) => {
  const root = fixture(t, {
    'AGENTS.md': '\\[Escaped](missing-escaped.md)\n\\\\[Broken](missing.md)\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 2,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
});

test('checks destinations after balanced nested brackets in link labels', (t) => {
  const root = fixture(t, { 'AGENTS.md': '[Guide [draft]](missing.md)\n' });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 1,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
});

test('checks a missing image inside a link label', (t) => {
  const root = fixture(t, { 'AGENTS.md': '[![Preview](missing.png)](README.md)\n' });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 1,
      message: 'Destino local ausente.',
      target: 'missing.png',
    },
  ]);
});

test('ignores image destinations inside image alt text', (t) => {
  const image = '![Screen ![detail](unused.png)](screen.png)';
  const root = fixture(t, {
    'AGENTS.md': `${image}\n[${image}](README.md)\n`,
    'screen.png': 'fixture',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('checks a reference definition destination on the next line', (t) => {
  const root = fixture(t, { 'AGENTS.md': '[Guide][ref]\n[ref]:\n  docs/missing.md\n' });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 2,
      message: 'Destino local ausente.',
      target: 'docs/missing.md',
    },
  ]);
});

test('does not read a reference destination across a blank line', (t) => {
  const root = fixture(t, {
    'AGENTS.md': '[ref]:\n\n  missing-example.md\n[Broken](missing.md)\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 4,
      message: 'Destino local ausente.',
      target: 'missing.md',
    },
  ]);
});

test('decodes HTML entities once in bare and angle-delimited destinations', (t) => {
  const root = fixture(t, {
    'AGENTS.md':
      '[Bare](docs/b&amp;c.md)\n' +
      '[Angle](<docs/b&amp;c.md>)\n' +
      '[Decimal](docs/b&#38;c.md)\n' +
      '[Hexadecimal](docs/b&#x26;c.md)\n' +
      '[Uppercase hexadecimal](docs/b&#X26;c.md)\n' +
      '[Escaped](docs/a\\&amp;b.md)\n' +
      '[Percent encoded](docs/a%26amp%3Bb.md)\n' +
      '[Once](docs/a&amp;amp;b.md)\n',
    'docs/b&c.md': '# Guide\n',
    'docs/a&amp;b.md': '# Encoded name\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('diagnoses unsupported named entities locally while ignoring external URLs', (t) => {
  const root = fixture(t, {
    'AGENTS.md': '[Local](docs/caf&eacute;.md)\n[Web](https://example.invalid/?q=&eacute;)\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, [
    {
      file: 'AGENTS.md',
      line: 1,
      message: 'Entidade HTML nomeada não suportada; use Unicode literal ou percent-encoding.',
      target: 'docs/caf&eacute;.md',
    },
  ]);
});
