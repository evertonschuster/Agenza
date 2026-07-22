#!/usr/bin/env python3
"""Claude Code Stop hook: fast, deterministic governance checks that must
pass before a turn is allowed to end. Wired via .claude/settings.json's
"Stop" hook.

Runs, in order, stopping the report at the first stage that has problems
so later noise from the same root cause doesn't drown the real issue:
    1. skill sync check   (scripts/sync_agent_skills.py --check)
    2. governance check   (scripts/check_agent_governance.py)
    3. architecture guard (scripts/architecture_guard.py)

Deliberately does NOT run build/test/lint - those are comparatively slow;
they remain the job of CI and the "Mandatory commands" section of
AGENTS.md, not a per-turn Stop hook (a slow Stop hook makes every turn
slow, and CI is the independent, agent-agnostic backstop regardless).

Exit code 2 blocks the turn from ending and feeds the failure back to
Claude via stderr; exit 0 allows it to end (see
https://code.claude.com/docs/en/hooks.md). To guarantee this never loops
indefinitely even if a governance problem can't be auto-resolved, this
hook reads `stop_hook_active` from its JSON stdin input and unconditionally
allows the stop on any retry - Claude Code's own ~8-attempt block cap is a
second, independent safety net on top of this one.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

import architecture_guard  # noqa: E402
import check_agent_governance  # noqa: E402
import sync_agent_skills  # noqa: E402


def _read_stop_hook_active() -> bool:
    if sys.stdin.isatty():
        return False
    try:
        raw = sys.stdin.read()
    except Exception:
        return False
    if not raw.strip():
        return False
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return False
    return bool(payload.get("stop_hook_active", False))


def _sync_problems() -> list[str]:
    problems: list[str] = []
    source_dir = sync_agent_skills.SOURCE_DIR
    for target_dir in sync_agent_skills.TARGET_DIRS:
        missing, divergent, extra = sync_agent_skills.diff_target(source_dir, target_dir)
        label = sync_agent_skills._display_path(target_dir)
        problems += [f"{label}: missing {rel.as_posix()}" for rel in missing]
        problems += [f"{label}: divergent {rel.as_posix()}" for rel in divergent]
        problems += [f"{label}: extra {rel.as_posix()}" for rel in extra]
    return problems


def _collect_sections() -> list[tuple[str, list[str]]]:
    sections: list[tuple[str, list[str]]] = []

    sync_problems = _sync_problems()
    if sync_problems:
        sections.append(("python scripts/sync_agent_skills.py", sync_problems))
        # Skip the checks below: both would restate the same root cause
        # (skills edited but not synced) in different words.
        return sections

    governance_problems = check_agent_governance.run_checks()
    if governance_problems:
        sections.append(("python scripts/check_agent_governance.py", governance_problems))

    guard_findings = [f for f in architecture_guard.run_all() if f.severity == "blocking"]
    if guard_findings:
        sections.append(
            (
                "python scripts/architecture_guard.py",
                [f"{f.file}:{f.line} ({f.category}) {f.message}" for f in guard_findings],
            )
        )

    return sections


def main() -> int:
    if _read_stop_hook_active():
        print(
            "claude_stop_guard: stop_hook_active=true - allowing the turn to end "
            "to avoid looping. Any governance issues below were NOT auto-resolved "
            "and still need attention in a follow-up turn.",
            file=sys.stderr,
        )
        for script, problems in _collect_sections():
            print(f"== {script} ==", file=sys.stderr)
            for problem in problems:
                print(f"  - {problem}", file=sys.stderr)
        return 0

    sections = _collect_sections()
    if not sections:
        return 0

    print("Governance gate failed - fix before finishing this turn:\n", file=sys.stderr)
    for script, problems in sections:
        print(f"== {script} ==", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print(file=sys.stderr)
    print(
        "Run the failing command(s) above directly for full output, fix the "
        "issue, then finish the turn again.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
