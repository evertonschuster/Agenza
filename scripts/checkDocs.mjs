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
  'ai-services/assistant-service/README.md',
  'docs/API.md',
  'docs/DEVELOPMENT.md',
  'docs/VISION.md',
];

function blank(text) {
  return text.replace(/[^\n]/g, ' ');
}

function isEscaped(text, index) {
  let slashes = 0;
  while (index > 0 && text[--index] === '\\') {
    slashes++;
  }
  return slashes % 2 === 1;
}

function fenceEnd(text, start, marker, depth) {
  const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[ \\t]*$`);
  let offset = text.indexOf('\n', start);
  if (offset < 0) {
    return text.length;
  }
  offset++;
  while (offset < text.length) {
    const newline = text.indexOf('\n', offset);
    const end = newline < 0 ? text.length : newline;
    let line = text.slice(offset, end);
    for (let level = 0; level < depth; level++) {
      if (!/^ {0,3}>/.test(line)) {
        return offset;
      }
      line = line.replace(/^ {0,3}> ?/, '');
    }
    if (closing.test(line)) {
      return end;
    }
    offset = end + 1;
  }
  return text.length;
}

function prose(text) {
  const tokens = /^ {0,3}((?:> {0,3})*)(`{3,}(?=[^`\n]*$)|~{3,})[^\n]*$|<!--|`+/gm;
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(tokens)) {
    if (match.index < cursor) {
      continue;
    }
    const start = match.index + match[0].length;
    let end;
    if (match[2]) {
      end = fenceEnd(text, start, match[2], match[1].split('>').length - 1);
    } else if (match[0] === '<!--') {
      const close = text.indexOf('-->', start);
      end = close < 0 ? text.length : close + 3;
    } else {
      if (isEscaped(text, match.index)) {
        continue;
      }
      const closing = new RegExp('(?<!`)`{' + match[0].length + '}(?!`)', 'g');
      closing.lastIndex = start;
      const close = closing.exec(text);
      if (!close || /\n[ \t]*(?:>[ \t]*)*\n/.test(text.slice(start, close.index))) {
        continue;
      }
      end = close.index + close[0].length;
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
  let linkLabelEnd = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== '[' || isEscaped(text, index)) {
      continue;
    }
    const isImage = text[index - 1] === '!' && !isEscaped(text, index - 1);
    if (index < linkLabelEnd && !isImage) {
      continue;
    }
    let depth = 1;
    let end = index + 1;
    for (; end < text.length && depth > 0; end++) {
      if (text[end] === '\\') {
        end++;
      } else if (text[end] === '[') {
        depth++;
      } else if (text[end] === ']') {
        depth--;
      }
    }
    const prefix = text.slice(text.lastIndexOf('\n', index - 1) + 1, index);
    const reference = text[end] === ':' && /^ {0,3}$/.test(prefix);
    if (depth || (text[end] !== '(' && !reference)) {
      continue;
    }
    const whitespace = /^[ \t]*(?:\n[ \t]*)?/;
    const start = end + 1 + whitespace.exec(text.slice(end + 1))[0].length;
    const target = destinationAt(text, start);
    if (target) {
      targets.push({ target, line: text.slice(0, index).split('\n').length });
    }
    if (isImage) {
      index = end;
    } else {
      linkLabelEnd = end;
    }
  }
  return targets;
}

function markdownDestination(target) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  let error;
  const value = target.replace(
    /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])|&(#(?:[xX][\da-fA-F]{1,6}|\d{1,7})|[a-zA-Z][a-zA-Z0-9]+);/g,
    (match, escaped, entity) => {
      if (escaped !== undefined) {
        return escaped;
      }
      if (!entity.startsWith('#')) {
        if (Object.hasOwn(entities, entity)) {
          return entities[entity];
        }
        error = 'Entidade HTML nomeada não suportada; use Unicode literal ou percent-encoding.';
        return match;
      }
      const point =
        entity[1].toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      if (point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) {
        return '\ufffd';
      }
      return String.fromCodePoint(point);
    },
  );
  return { value, error };
}

function sectionLines(content, title) {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${title}`) + 1;
  if (!start) {
    return { start: 0, end: 0 };
  }
  const next = lines.findIndex((line, index) => index >= start && /^#{1,2}\s/.test(line));
  return { start, end: next < 0 ? lines.length + 1 : next + 1 };
}

// Hosts parse this block as YAML and silently skip a skill whose frontmatter does not parse.
export function frontmatterProblems(text, name) {
  const lines = text.split('\n');
  if (lines[0] !== '---') {
    return [{ line: 1, message: 'Skill sem frontmatter.', target: '---' }];
  }
  const end = lines.indexOf('---', 1);
  if (end < 0) {
    return [{ line: 1, message: 'Frontmatter da skill sem fechamento.', target: '---' }];
  }
  const problems = [];
  const fields = {};
  let block;
  for (let index = 1; index < end; index++) {
    const line = lines[index];
    if (block && (/^\s/.test(line) || !line.trim())) {
      block.value += ` ${line.trim()}`;
      continue;
    }
    block = undefined;
    const field = /^([a-z][\w-]*):[ \t]*(.*)$/.exec(line);
    if (!field) {
      if (line.trim()) {
        problems.push({ line: index + 1, message: 'Linha inválida no frontmatter.', target: line });
      }
      continue;
    }
    const [, key, value] = field;
    fields[key] = { line: index + 1, value };
    if (value === '' || /^[|>][-+1-9]*$/.test(value)) {
      block = fields[key];
      block.value = '';
      continue;
    }
    const quoted = /^(["']).*\1$/.exec(value);
    if (quoted) {
      fields[key].value = value.slice(1, -1);
    } else if (/:(?:\s|$)|\s#/.test(value) || /^[[\]{}&*!|>%@`"']/.test(value)) {
      problems.push({
        line: index + 1,
        message: 'Valor sem aspas que o YAML não lê como texto; reescreva sem ": " ou use aspas.',
        target: key,
      });
    }
  }
  if (fields.name?.value !== name) {
    problems.push({
      line: fields.name?.line ?? 1,
      message: 'O name da skill difere do nome da pasta.',
      target: name,
    });
  }
  const description = fields.description?.value.trim() ?? '';
  const descriptionLine = fields.description?.line ?? 1;
  if (!/\bUse\b/.test(description) || !/\bNot for\b/.test(description)) {
    problems.push({
      line: descriptionLine,
      message: 'A description precisa dizer quando usar ("Use …") e quando não ("Not for …").',
      target: 'description',
    });
  }
  if (description.length > 1024) {
    problems.push({
      line: descriptionLine,
      message: 'A description passa de 1024 caracteres.',
      target: 'description',
    });
  }
  return problems;
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
  if (existsSync(resolve(root, 'docs/decisions'))) {
    collect('docs/decisions');
  }

  const routedSkills = new Set();
  for (const file of documents) {
    const absolute = resolve(root, file);
    if (!existsSync(absolute)) {
      report(file, 1, 'Documento ativo ausente.', file);
      continue;
    }
    const text = readFileSync(absolute, 'utf8')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n');
    if (skillFiles.has(file)) {
      for (const problem of frontmatterProblems(text, basename(dirname(file)))) {
        report(file, problem.line, problem.message, problem.target);
      }
    }
    const content = prose(text);
    const targets = linkTargets(content);
    const skillTable = file === 'AGENTS.md' ? sectionLines(content, 'Skills') : undefined;
    if (basename(file) === 'CLAUDE.md') {
      for (const match of content.matchAll(/^@(?:"([^"\n]+)"|(\S+))[ \t]*$/gm)) {
        targets.push({
          target: match[1] ?? match[2],
          line: content.slice(0, match.index).split('\n').length,
        });
      }
    }
    for (const { target, line } of targets) {
      const decoded = markdownDestination(target);
      if (
        /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(decoded.value) ||
        /<[^>]+>|\[[A-Z][A-Z0-9_-]*\]|\$\{[^}]+\}/.test(decoded.value)
      ) {
        continue;
      }
      if (decoded.error) {
        report(file, line, decoded.error, target);
        continue;
      }
      const rawPath = decoded.value.split(/[?#]/)[0];
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
      } else if (skillTable && line > skillTable.start && line < skillTable.end) {
        routedSkills.add(local);
      }
    }
  }
  for (const file of skillFiles) {
    if (existsSync(resolve(root, file)) && !routedSkills.has(file)) {
      report('AGENTS.md', 1, 'Skill sem rota na seção Skills do AGENTS da raiz.', file);
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
