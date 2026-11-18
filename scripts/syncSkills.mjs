import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceDirectory = '.claude/skills';
export const copyDirectory = '.agents/skills';

function skillNames(root, directory) {
  const absolute = resolve(root, directory);
  if (!existsSync(absolute)) {
    return [];
  }
  return readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('agenza-'))
    .map((entry) => entry.name);
}

function filesUnder(absolute) {
  if (!existsSync(absolute)) {
    return [];
  }
  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(absolute, join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
}

function normalized(file) {
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

export function skillCopyDifferences(root) {
  const differences = [];
  const sources = skillNames(root, sourceDirectory);
  for (const name of skillNames(root, copyDirectory)) {
    if (!sources.includes(name)) {
      differences.push({ file: `${copyDirectory}/${name}`, kind: 'extra' });
    }
  }
  for (const name of sources) {
    const source = resolve(root, sourceDirectory, name);
    const copy = resolve(root, copyDirectory, name);
    const sourceFiles = filesUnder(source);
    for (const file of filesUnder(copy)) {
      if (!sourceFiles.includes(file)) {
        differences.push({ file: `${copyDirectory}/${name}/${file}`, kind: 'extra' });
      }
    }
    for (const file of sourceFiles) {
      const copied = join(copy, file);
      if (!existsSync(copied)) {
        differences.push({ file: `${copyDirectory}/${name}/${file}`, kind: 'missing' });
      } else if (normalized(copied) !== normalized(join(source, file))) {
        differences.push({ file: `${copyDirectory}/${name}/${file}`, kind: 'stale' });
      }
    }
  }
  return differences;
}

export function syncSkills(root) {
  const sources = skillNames(root, sourceDirectory);
  for (const name of skillNames(root, copyDirectory)) {
    rmSync(resolve(root, copyDirectory, name), { recursive: true, force: true });
  }
  for (const name of sources) {
    const source = resolve(root, sourceDirectory, name);
    for (const file of filesUnder(source)) {
      const target = resolve(root, copyDirectory, name, file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, normalized(join(source, file)));
    }
  }
  return sources.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = syncSkills(fileURLToPath(new URL('../', import.meta.url)));
  console.log(`${count} skills Agenza copiadas para ${copyDirectory}.`);
}
