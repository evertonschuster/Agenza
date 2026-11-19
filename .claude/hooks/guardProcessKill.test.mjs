import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { decide } from './guardProcessKill.mjs';

const script = fileURLToPath(new URL('./guardProcessKill.mjs', import.meta.url));
const verdict = (command) => decide(command)?.permissionDecision ?? 'allow';

test('refuses to stop processes chosen by name or port', () => {
  for (const command of [
    'taskkill /F /IM node.exe',
    'taskkill /im dotnet.exe /t',
    'Stop-Process -Name node -Force',
    'Get-Process dotnet | Stop-Process',
    'Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { $_.OwningProcess } | Stop-Process',
    'kill -Name vite',
    'pkill -f vite',
    'killall node',
    'fuser -k 5080/tcp',
    'npx kill-port 5173',
    'kill -9 $(lsof -ti :5173)',
    'lsof -ti :5080 | xargs kill',
  ]) {
    assert.equal(verdict(command), 'deny', command);
  }
});

test('lets an agent stop a PID it started and run ordinary commands', () => {
  for (const command of [
    'taskkill /pid 4242 /T /F',
    'Stop-Process -Id 4242',
    'kill 4242',
    'npm run test',
    'git log --oneline -5',
    'echo "skill name: agenza-testing"',
  ]) {
    assert.equal(verdict(command), 'allow', command);
  }
});

test('asks before stopping or removing containers', () => {
  for (const command of [
    'docker stop agenza-postgres',
    'docker rm -f scratch-pg',
    'docker compose down',
    'docker-compose stop',
    'docker volume rm agenza-postgres-data',
  ]) {
    assert.equal(verdict(command), 'ask', command);
  }
  assert.equal(verdict('docker ps'), 'allow');
  assert.equal(verdict('docker run --rm -p 5433:5432 postgres:17'), 'allow');
});

test('answers the PreToolUse payload as hook JSON and stays silent when allowed', () => {
  const run = (input) => spawnSync(process.execPath, [script], { input, encoding: 'utf8' });
  const payload = (command) => JSON.stringify({ tool_name: 'PowerShell', tool_input: { command } });
  const denied = run(payload('Stop-Process -Name node'));
  assert.equal(denied.status, 0);
  assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const allowed = run(payload('npm run lint'));
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout, '');
  assert.equal(run('not json').status, 0);
});
