import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const entryDocuments = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  '.github/copilot-instructions.md',
  'backend/AGENTS.md',
  'backend/CLAUDE.md',
  'backend/README.md',
  'backend/docs/ARCHITECTURE.md',
  'apps/admin-frontend/AGENTS.md',
  'apps/admin-frontend/CLAUDE.md',
  'apps/admin-frontend/README.md',
  'apps/admin-frontend/docs/ARCHITECTURE.md',
  'apps/admin-frontend/.specify/memory/constitution.md',
  'ai-services/assistant-service/README.md',
  'docs/API.md',
  'docs/MONOREPO.md',
  'docs/QUALITY.md',
  'docs/VISION.md',
  'docs/adr/README.md',
];

function blank(text) {
  return text.replace(/[^\n]/g, ' ');
}

function prose(text, { preserveInlineCode = false } = {}) {
  const tokens = /(?:^ {0,3}(`{3,}|~{3,})[^\n]*$)|<!--|`+/gm;
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(tokens)) {
    if (match.index < cursor) {
      continue;
    }
    const start = match.index + match[0].length;
    let end;
    if (match[1]) {
      const closing = new RegExp(`^ {0,3}${match[1][0]}{${match[1].length},}[ \\t]*$`, 'gm');
      closing.lastIndex = start;
      const close = closing.exec(text);
      end = close ? close.index + close[0].length : text.length;
    } else if (match[0] === '<!--') {
      const close = text.indexOf('-->', start);
      end = close < 0 ? text.length : close + 3;
    } else {
      const closing = new RegExp('(?<!`)`{' + match[0].length + '}(?!`)', 'g');
      closing.lastIndex = start;
      const close = closing.exec(text);
      if (!close) {
        continue;
      }
      end = close.index + close[0].length;
      if (preserveInlineCode) {
        parts.push(text.slice(cursor, end));
        cursor = end;
        continue;
      }
    }
    parts.push(text.slice(cursor, match.index), blank(text.slice(match.index, end)));
    cursor = end;
  }
  return parts.join('') + text.slice(cursor);
}

function destinationAt(text, start) {
  if (text[start] === '<') {
    const end = text.indexOf('>', start + 1);
    if (end < 0 || text.slice(start, end).includes('\n')) {
      return undefined;
    }
    return text.slice(start + 1, end);
  }

  let depth = 0;
  let end = start;
  for (; end < text.length; end++) {
    const char = text[end];
    if (char === '\\') {
      end++;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      if (depth === 0) {
        break;
      }
      depth--;
    } else if (/\s/.test(char)) {
      break;
    }
  }
  return text.slice(start, end);
}

function linkTargets(text) {
  const targets = [];
  for (const pattern of [/\[[^\]]*\]\([ \t\n]*/g, /^ {0,3}\[[^\]\n]+\]:[ \t]*/gm]) {
    for (const match of text.matchAll(pattern)) {
      const target = destinationAt(text, match.index + match[0].length);
      if (target) {
        targets.push({ target, line: text.slice(0, match.index).split('\n').length });
      }
    }
  }
  return targets;
}

function scalar(value) {
  const trimmed = value.trim();
  const doubleQuoted = /^("(?:[^"\\]|\\.)*")(?:\s+#.*)?$/.exec(trimmed);
  if (doubleQuoted) {
    try {
      return JSON.parse(doubleQuoted[1]);
    } catch {
      return '';
    }
  }
  const singleQuoted = /^('(?:[^']|'')*')(?:\s+#.*)?$/.exec(trimmed);
  if (singleQuoted) {
    return singleQuoted[1].slice(1, -1).replace(/''/g, "'");
  }
  const plain = trimmed.replace(/\s+#.*$/, '').trim();
  if (
    !plain ||
    /^(?:null|true|false|~|[-+]?\d+(?:\.\d*)?(?:e[-+]?\d+)?)$/i.test(plain) ||
    /^[#\[\]{},&*!"']/.test(plain)
  ) {
    return '';
  }
  return plain;
}

function checkFrontmatter(text, report) {
  const lines = text.split('\n');
  const end = lines.findIndex((line, index) => index > 0 && /^(?:---|\.\.\.)\s*$/.test(line));
  if (!/^---\s*$/.test(lines[0]) || end < 0) {
    report(1, 'Frontmatter ausente ou sem fechamento.', 'name, description');
    return;
  }

  for (const key of ['name', 'description']) {
    const entries = lines.slice(1, end).flatMap((line, index) => {
      const match = new RegExp(`^${key}:[ \\t]*(.*)$`).exec(line);
      return match ? [{ value: match[1], line: index + 2 }] : [];
    });
    if (entries.length !== 1) {
      report(entries[1]?.line ?? 1, 'Campo obrigatório ausente ou duplicado.', key);
      continue;
    }
    const entry = entries[0];
    let value = scalar(entry.value);
    if (/^[|>][+-]?(?:\s+#.*)?$/.test(entry.value.trim())) {
      const block = [];
      for (let index = entry.line; index < end; index++) {
        if (lines[index].trim() && !/^[ \t]/.test(lines[index])) {
          break;
        }
        block.push(lines[index]);
      }
      value = block.join(' ').trim();
    }
    if (!value.trim()) {
      report(entry.line, 'Campo obrigatório deve conter texto.', key);
    } else if (key === 'name' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      report(entry.line, 'Nome de skill inválido; use letras minúsculas, números e hífens.', value);
    }
  }
}

function checkAdrIndex(text, directory, report) {
  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  let inSection = false;
  let column = -1;
  let tableFound = false;
  for (const [index, line] of text.split('\n').entries()) {
    if (/^## Current decisions by concern\s*$/.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,2} /.test(line)) {
      break;
    }
    if (!inSection || !line.trim().startsWith('|')) {
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());
    if (column < 0) {
      column = cells.indexOf('Current ADRs');
      tableFound ||= column >= 0;
      continue;
    }
    for (const match of (cells[column] ?? '').matchAll(/\b\d{4}\b/g)) {
      const id = match[0];
      const candidates = files.filter((file) => file.startsWith(`${id}-`) && file.endsWith('.md'));
      if (candidates.length !== 1) {
        report(index + 1, 'ADR vigente deve corresponder a um único arquivo.', id);
      }
    }
  }
  if (!tableFound) {
    report(
      1,
      'Tabela de decisões vigentes não encontrada.',
      'Current decisions by concern / Current ADRs',
    );
  }
}

export function checkDocumentation(root) {
  const errors = [];
  const documents = new Set(entryDocuments);
  const skillFiles = new Set();
  function report(file, line, message, target = '') {
    errors.push({ file, line, message, target });
  }
  function collect(directory) {
    for (const entry of readdirSync(resolve(root, directory), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        collect(file);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        documents.add(file);
      }
    }
  }

  const skillsDirectory = '.claude/skills';
  if (existsSync(resolve(root, skillsDirectory))) {
    for (const entry of readdirSync(resolve(root, skillsDirectory), { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('agenza-')) {
        const directory = `${skillsDirectory}/${entry.name}`;
        const file = `${directory}/SKILL.md`;
        documents.add(file);
        skillFiles.add(file);
        collect(directory);
      }
    }
  } else {
    report(skillsDirectory, 1, 'Diretório de skills canônicas ausente.', skillsDirectory);
  }

  for (const file of documents) {
    const absolute = resolve(root, file);
    if (!existsSync(absolute)) {
      report(file, 1, 'Documento ativo ausente.', file);
      continue;
    }
    const text = readFileSync(absolute, 'utf8')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n');
    const content = prose(text);
    const targets = linkTargets(content);
    if (basename(file) === 'CLAUDE.md') {
      for (const match of content.matchAll(/^@(?:"([^"\n]+)"|(\S+))[ \t]*$/gm)) {
        targets.push({
          target: match[1] ?? match[2],
          line: content.slice(0, match.index).split('\n').length,
        });
      }
    }
    for (const { target, line } of targets) {
      if (
        /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(target) ||
        /<[^>]+>|\[[A-Z][A-Z0-9_-]*\]|\$\{[^}]+\}/.test(target)
      ) {
        continue;
      }
      const rawPath = target
        .split(/[?#]/)[0]
        .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1');
      let path;
      try {
        path = decodeURIComponent(rawPath);
      } catch {
        report(file, line, 'Destino com codificação inválida.', target);
        continue;
      }
      const destination = path.startsWith('/')
        ? resolve(root, `.${path}`)
        : resolve(dirname(absolute), path);
      const local = relative(root, destination).replaceAll('\\', '/');
      if (local === '..' || local.startsWith('../')) {
        report(file, line, 'Destino fora do repositório.', target);
      } else if (!existsSync(destination)) {
        report(file, line, 'Destino local ausente.', target);
      }
    }
    if (skillFiles.has(file)) {
      checkFrontmatter(text, (line, message, target) => report(file, line, message, target));
    }
    if (file === 'docs/adr/README.md') {
      checkAdrIndex(
        prose(text, { preserveInlineCode: true }),
        dirname(absolute),
        (line, message, target) => report(file, line, message, target),
      );
    }
  }
  return { errors, documents: documents.size, skills: skillFiles.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkDocumentation(fileURLToPath(new URL('../', import.meta.url)));
  for (const error of result.errors) {
    console.error(`${error.file}:${error.line}: ${error.message} [${error.target}]`);
  }
  if (result.errors.length) {
    process.exitCode = 1;
  } else {
    console.log(
      `Documentação verificada: ${result.documents} arquivos e ${result.skills} skills Agenza.`,
    );
  }
}
