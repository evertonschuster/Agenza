import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const skillPath = /skills[\\/]+(agenza-[a-z-]+)[\\/]+SKILL\.md/g;

function skillsIn(text) {
  return [...String(text).matchAll(skillPath)].map((match) => match[1]);
}

// Each event becomes the tool calls it holds: the skills a call loads, or none for any other work.
export function toolCalls(host, event) {
  if (host === 'claude') {
    if (event.type !== 'assistant') {
      return [];
    }
    return (event.message?.content ?? [])
      .filter((part) => part.type === 'tool_use')
      .map((part) =>
        part.name === 'Skill'
          ? [part.input?.skill].filter(Boolean)
          : skillsIn(part.input?.file_path ?? part.input?.path ?? ''),
      );
  }
  if (event.type === 'item.started' && event.item?.type === 'command_execution') {
    return [skillsIn(event.item.command)];
  }
  return [];
}

// The window closes after `budget` calls that load no skill: by then the agent is doing the task.
export function createScorer(host, budget) {
  const loaded = [];
  let otherCalls = 0;
  return {
    loaded,
    push(event) {
      for (const skills of toolCalls(host, event)) {
        if (skills.length) {
          loaded.push(...skills.filter((skill) => !loaded.includes(skill)));
        } else {
          otherCalls++;
        }
      }
      return otherCalls >= budget;
    },
  };
}

export function isHit(expected, loaded) {
  return expected === null ? loaded.length === 0 : loaded.includes(expected);
}

const commands = {
  claude: (options) => [
    'claude',
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--no-session-persistence',
    '--permission-mode',
    'plan',
    '--disallowedTools',
    'Edit',
    'Write',
    'NotebookEdit',
    'Bash',
    ...(options.model ? ['--model', options.model] : []),
  ],
  codex: (options) => [
    process.env.CODEX_BIN ?? 'codex',
    'exec',
    '--json',
    '--sandbox',
    'read-only',
    '--ephemeral',
    ...(options.model && !options.modelFromConfig ? ['--model', options.model] : []),
    '-',
  ],
};

function quote(argument) {
  return /^[\w./:\\-]+$/.test(argument) ? argument : `"${argument}"`;
}

function stopTree(child) {
  if (child.exitCode !== null) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function runOnce(host, prompt, options) {
  const [command, ...args] = commands[host](options);
  return new Promise((done) => {
    // The prompt goes through stdin, so no prompt text reaches the shell.
    const child = spawn([command, ...args].map(quote).join(' '), {
      cwd: options.cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const scorer = createScorer(host, options.budget);
    let buffer = '';
    let model = options.model ?? '';
    let finished = false;
    const finish = (status) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        stopTree(child);
        done({ loaded: scorer.loaded, status, model });
      }
    };
    const timer = setTimeout(() => finish('timeout'), options.timeout * 1000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        model ||= event.type === 'system' ? (event.model ?? '') : '';
        if (event.type === 'error' || event.type === 'turn.failed') {
          finish(`error: ${String(event.message ?? event.error?.message).slice(0, 160)}`);
        } else if (scorer.push(event)) {
          finish('window');
        }
      }
    });
    child.on('close', () => finish('ended'));
    child.stdin.end(prompt);
  });
}

function version(host) {
  const [command] = commands[host]({});
  const run = spawnSync(`${quote(command)} --version`, { shell: true, encoding: 'utf8' });
  return (run.stdout || run.stderr || '').trim().split('\n')[0];
}

async function main() {
  const { values } = parseArgs({
    options: {
      host: { type: 'string', default: 'claude' },
      runs: { type: 'string', default: '3' },
      only: { type: 'string' },
      model: { type: 'string' },
      budget: { type: 'string', default: '4' },
      timeout: { type: 'string', default: '180' },
    },
  });
  if (!commands[values.host]) {
    throw new Error(`Host desconhecido: ${values.host}. Use claude ou codex.`);
  }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const cases = JSON.parse(readFileSync(resolve(root, 'scripts/skillEvals.json'), 'utf8')).filter(
    (item) => !values.only || values.only.split(',').includes(item.id),
  );
  const options = {
    cwd: root,
    model: values.model,
    budget: Number(values.budget),
    timeout: Number(values.timeout),
  };
  const codexConfig = join(homedir(), '.codex/config.toml');
  if (values.host === 'codex' && !options.model && existsSync(codexConfig)) {
    options.model = /^model\s*=\s*"([^"]+)"/m.exec(readFileSync(codexConfig, 'utf8'))?.[1];
    options.modelFromConfig = true;
  }
  const runs = Number(values.runs);
  console.log(`host ${values.host} · ${version(values.host)} · ${runs} execuções por prompt`);
  let hits = 0;
  let total = 0;
  const models = new Set();
  for (const item of cases) {
    const results = [];
    for (let index = 0; index < runs; index++) {
      results.push(await runOnce(values.host, item.prompt, options));
    }
    const caseHits = results.filter((result) => isHit(item.expected, result.loaded)).length;
    hits += caseHits;
    total += runs;
    results.forEach((result) => result.model && models.add(result.model));
    const seen = results
      .map((result) =>
        result.status.startsWith('error') ? result.status : result.loaded.join('+') || '—',
      )
      .join(' | ');
    console.log(
      `${caseHits === runs ? 'ok ' : 'NOK'} ${item.id.padEnd(13)} ${caseHits}/${runs}  esperado ${item.expected ?? 'nenhuma'}  visto ${seen}`,
    );
  }
  console.log(`total ${hits}/${total}${models.size ? ` · modelo ${[...models].join(', ')}` : ''}`);
  process.exitCode = hits === total ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
