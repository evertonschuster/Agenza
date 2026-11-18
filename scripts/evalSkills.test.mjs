import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createScorer, isHit, toolCalls } from './evalSkills.mjs';

function claudeTool(name, input) {
  return { type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } };
}

function codexCommand(command) {
  return { type: 'item.started', item: { type: 'command_execution', command } };
}

test('reads a Claude skill from the Skill tool or from a Read of its SKILL.md', () => {
  assert.deepEqual(toolCalls('claude', claudeTool('Skill', { skill: 'agenza-form-field' })), [
    ['agenza-form-field'],
  ]);
  assert.deepEqual(
    toolCalls(
      'claude',
      claudeTool('Read', { file_path: 'D:\\repo\\.claude\\skills\\agenza-testing\\SKILL.md' }),
    ),
    [['agenza-testing']],
  );
  assert.deepEqual(toolCalls('claude', claudeTool('Grep', { pattern: 'price' })), [[]]);
  assert.deepEqual(toolCalls('claude', { type: 'user', message: { content: [] } }), []);
});

test('reads Codex skills from a command that opens either skill folder', () => {
  assert.deepEqual(
    toolCalls(
      'codex',
      codexCommand(
        "powershell -Command 'Get-Content apps/admin-frontend/AGENTS.md; Get-Content .claude/skills/agenza-frontend-slice/SKILL.md; Get-Content .agents/skills/agenza-form-field/SKILL.md'",
      ),
    ),
    [['agenza-frontend-slice', 'agenza-form-field']],
  );
  assert.deepEqual(toolCalls('codex', codexCommand('git status')), [[]]);
  assert.deepEqual(
    toolCalls('codex', { type: 'item.completed', item: { type: 'command_execution' } }),
    [],
  );
});

test('closes the window after the budget of calls that load no skill', () => {
  const scorer = createScorer('claude', 2);
  assert.equal(scorer.push(claudeTool('Skill', { skill: 'agenza-form-field' })), false);
  assert.equal(scorer.push(claudeTool('Grep', { pattern: 'a' })), false);
  assert.equal(scorer.push(claudeTool('Skill', { skill: 'agenza-form-field' })), false);
  assert.equal(scorer.push(claudeTool('Glob', { pattern: '*' })), true);
  assert.deepEqual(scorer.loaded, ['agenza-form-field']);
});

test('counts a hit when the expected skill loaded, or when none loaded for a negative prompt', () => {
  assert.equal(isHit('agenza-form-field', ['agenza-frontend-slice', 'agenza-form-field']), true);
  assert.equal(isHit('agenza-form-field', ['agenza-frontend-slice']), false);
  assert.equal(isHit(null, []), true);
  assert.equal(isHit(null, ['agenza-ptbr-copy']), false);
});

test('every eval case names an existing skill or none, with a unique id', () => {
  const cases = JSON.parse(readFileSync(new URL('./skillEvals.json', import.meta.url), 'utf8'));
  const ids = cases.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of cases) {
    assert.ok(item.prompt.trim(), item.id);
    if (item.expected !== null) {
      const skill = new URL(`../.claude/skills/${item.expected}/SKILL.md`, import.meta.url);
      assert.ok(readFileSync(skill, 'utf8'), item.expected);
    }
  }
});
