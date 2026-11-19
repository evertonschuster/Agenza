import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The owner's Aspire stack and other agents' servers share this machine; only a PID the agent
// started is safe to stop, so anything that picks its target by name or port is refused.
const byNameOrPort = [
  /\btaskkill\b[^\n;|&]*\/im\b/i,
  /\b(?:stop-process|spps|kill)\b[^\n;|&]*-(?:name|processname)\b/i,
  /\|\s*(?:stop-process|spps|kill)\b/i,
  /\b(?:pkill|killall|fuser\s+-k|kill-port)\b/i,
  /\bkill\b[^\n;|&]*\$\(\s*lsof\b/i,
  /\blsof\b[^\n]*\|\s*xargs\s+kill\b/i,
];

const containerStop = [
  /\bdocker\s+(?:container\s+)?(?:stop|kill|restart|rm|prune)\b/i,
  /\bdocker[\s-]+compose\b[^\n;|&]*\b(?:down|stop|kill|restart|rm)\b/i,
  /\bdocker\s+(?:system|volume|network)\s+(?:prune|rm)\b/i,
];

export function decide(command) {
  if (byNameOrPort.some((pattern) => pattern.test(command))) {
    return {
      permissionDecision: 'deny',
      permissionDecisionReason:
        'Bloqueado: não pare processos por nome ou porta. Pare só o PID que você iniciou ' +
        '(taskkill /PID <pid> /T, Stop-Process -Id, kill <pid>); se não foi você, peça ao dono.',
    };
  }
  if (containerStop.some((pattern) => pattern.test(command))) {
    return {
      permissionDecision: 'ask',
      permissionDecisionReason:
        'Parar ou remover containers pode derrubar o Aspire do dono; confirme que foi você que o iniciou.',
    };
  }
  return undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    const verdict = decide(String(input.tool_input?.command ?? ''));
    if (verdict) {
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', ...verdict } }),
      );
    }
  } catch {
    // An unreadable payload falls through to the normal permission flow.
  }
}
