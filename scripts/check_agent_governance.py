#!/usr/bin/env python3
"""Verify the structural consistency of the AI agent governance framework
described in docs/AGENT-GOVERNANCE.md.

This does NOT scan application source code for anti-patterns — that's
scripts/architecture_guard.py's job. This script only checks that the
governance *meta-files themselves* are present, consistent, and in sync:

- AGENTS.md exists at every required location.
- Every CLAUDE.md that should import AGENTS.md does.
- Every canonical skill under agent-skills/ has valid, portable frontmatter.
- .agents/skills/ and .claude/skills/ are byte-identical to agent-skills/.
- Every docs/adr/NNNN reference mentioned in a governance file resolves to
  a real ADR file.
- Every scripts/*.py reference mentioned in a governance file exists.
- Documented npm scripts actually exist in the relevant package.json.
- .codex/skills is not used as a skill distribution directory.

Usage:
    python scripts/check_agent_governance.py

Exit code: 0 if every check passes, 1 if any problem is found (every
problem is printed, not just the first).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sync_agent_skills  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent

REQUIRED_AGENTS_MD = [
    REPO_ROOT / "AGENTS.md",
    REPO_ROOT / "backend" / "AGENTS.md",
    REPO_ROOT / "apps" / "admin-frontend" / "AGENTS.md",
]

REQUIRED_CLAUDE_MD = [
    REPO_ROOT / "CLAUDE.md",
    REPO_ROOT / "backend" / "CLAUDE.md",
    REPO_ROOT / "apps" / "admin-frontend" / "CLAUDE.md",
]

FORBIDDEN_FRONTMATTER_KEYS = {
    "allowed-tools",
    "disallowed-tools",
    "context",
    "agent",
    "hooks",
    "model",
    "tools",
    "disable-model-invocation",
}

GOVERNANCE_DOC_GLOBS = [
    "AGENTS.md",
    "backend/AGENTS.md",
    "apps/admin-frontend/AGENTS.md",
    "docs/AGENT-GOVERNANCE.md",
]

ADR_REF_PATTERN = re.compile(r"docs/adr/(\d{4})")
SCRIPT_REF_PATTERN = re.compile(r"scripts/([\w-]+\.py)")
NPM_RUN_PATTERN = re.compile(r"npm run ([\w:.-]+)")


def check_agents_md_exists() -> list[str]:
    problems = []
    for path in REQUIRED_AGENTS_MD:
        if not path.is_file():
            problems.append(f"missing required file: {_rel(path)}")
    return problems


def check_claude_md_imports() -> list[str]:
    problems = []
    for path in REQUIRED_CLAUDE_MD:
        if not path.is_file():
            problems.append(f"missing required file: {_rel(path)}")
            continue
        content = path.read_text(encoding="utf-8")
        if "@AGENTS.md" not in content:
            problems.append(f"{_rel(path)} does not import @AGENTS.md")
    return problems


def _parse_frontmatter(text: str) -> tuple[dict[str, str], str] | None:
    """Return (fields, raw_frontmatter_text) for a '---'-delimited YAML-ish
    frontmatter block, or None if the file has none. Deliberately simple
    (key: value per line) since canonical skill frontmatter is constrained
    to portable name/description fields only."""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    raw = text[3:end]
    fields: dict[str, str] = {}
    current_key: str | None = None
    for line in raw.splitlines():
        if not line.strip():
            continue
        if line.startswith((" ", "\t")) and current_key is not None:
            fields[current_key] += " " + line.strip()
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            fields[key] = value.strip()
            current_key = key
    return fields, raw


def check_skill_frontmatter() -> list[str]:
    problems = []
    source_dir = REPO_ROOT / "agent-skills"
    if not source_dir.is_dir():
        return [f"missing canonical skills source: {_rel(source_dir)}"]

    for skill_dir in sorted(p for p in source_dir.iterdir() if p.is_dir()):
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.is_file():
            problems.append(f"{_rel(skill_dir)}: missing SKILL.md")
            continue

        text = skill_file.read_text(encoding="utf-8")
        parsed = _parse_frontmatter(text)
        if parsed is None:
            problems.append(f"{_rel(skill_file)}: missing '---' frontmatter block")
            continue
        fields, _raw = parsed

        if not fields.get("name"):
            problems.append(f"{_rel(skill_file)}: frontmatter missing 'name'")
        elif fields["name"] != skill_dir.name:
            problems.append(
                f"{_rel(skill_file)}: frontmatter name '{fields['name']}' "
                f"!= directory name '{skill_dir.name}'"
            )

        if not fields.get("description"):
            problems.append(f"{_rel(skill_file)}: frontmatter missing 'description'")

        # Use the already continuation-aware `fields` keys, not a fresh
        # per-line split of `raw` - a wrapped multi-line description whose
        # continuation line happens to contain a colon (e.g. "...the
        # model: which layer owns it...") would otherwise be misread as a
        # new top-level key by a naive split.
        forbidden_present = set(fields.keys()) & FORBIDDEN_FRONTMATTER_KEYS
        if forbidden_present:
            problems.append(
                f"{_rel(skill_file)}: frontmatter has tool-specific key(s) "
                f"{sorted(forbidden_present)} - keep those out of the canonical skill"
            )

    return problems


def check_skills_synced() -> list[str]:
    problems = []
    source_dir = REPO_ROOT / "agent-skills"
    if not source_dir.is_dir():
        return [f"missing canonical skills source: {_rel(source_dir)}"]

    for target_dir in sync_agent_skills.TARGET_DIRS:
        missing, divergent, extra = sync_agent_skills.diff_target(source_dir, target_dir)
        label = _rel(target_dir)
        for rel in missing:
            problems.append(f"{label}: missing skill file {rel.as_posix()} (run sync_agent_skills.py)")
        for rel in divergent:
            problems.append(f"{label}: divergent skill file {rel.as_posix()} (run sync_agent_skills.py)")
        for rel in extra:
            problems.append(f"{label}: extra skill file {rel.as_posix()} not in agent-skills/ (manual copy?)")

    return problems


def check_no_codex_skills_dir() -> list[str]:
    legacy = REPO_ROOT / ".codex" / "skills"
    if legacy.exists():
        return [
            f"{_rel(legacy)} exists - .agents/skills is the Codex distribution "
            "directory for this repo, not .codex/skills"
        ]
    return []


def check_adr_references() -> list[str]:
    problems = []
    adr_dir = REPO_ROOT / "docs" / "adr"
    existing_numbers = set()
    if adr_dir.is_dir():
        for path in adr_dir.glob("*.md"):
            match = re.match(r"(\d{4})-", path.name)
            if match:
                existing_numbers.add(match.group(1))

    for rel_doc in GOVERNANCE_DOC_GLOBS:
        doc_path = REPO_ROOT / rel_doc
        if not doc_path.is_file():
            continue
        text = doc_path.read_text(encoding="utf-8")
        for match in ADR_REF_PATTERN.finditer(text):
            number = match.group(1)
            if number not in existing_numbers:
                problems.append(f"{rel_doc} references docs/adr/{number} which does not exist")

    for skill_file in sorted((REPO_ROOT / "agent-skills").glob("*/SKILL.md")):
        text = skill_file.read_text(encoding="utf-8")
        for match in ADR_REF_PATTERN.finditer(text):
            number = match.group(1)
            if number not in existing_numbers:
                problems.append(f"{_rel(skill_file)} references docs/adr/{number} which does not exist")

    return problems


def check_referenced_scripts_exist() -> list[str]:
    problems = []
    seen: set[str] = set()
    docs_to_scan = list(GOVERNANCE_DOC_GLOBS) + ["CLAUDE.md", "backend/CLAUDE.md", "apps/admin-frontend/CLAUDE.md"]
    for rel_doc in docs_to_scan:
        doc_path = REPO_ROOT / rel_doc
        if not doc_path.is_file():
            continue
        text = doc_path.read_text(encoding="utf-8")
        for match in SCRIPT_REF_PATTERN.finditer(text):
            script_name = match.group(1)
            seen.add(script_name)

    settings_path = REPO_ROOT / ".claude" / "settings.json"
    if settings_path.is_file():
        for match in SCRIPT_REF_PATTERN.finditer(settings_path.read_text(encoding="utf-8")):
            seen.add(match.group(1))

    for script_name in sorted(seen):
        if not (REPO_ROOT / "scripts" / script_name).is_file():
            problems.append(f"referenced script scripts/{script_name} does not exist")

    return problems


def check_documented_npm_commands() -> list[str]:
    problems = []
    package_json_path = REPO_ROOT / "apps" / "admin-frontend" / "package.json"
    if not package_json_path.is_file():
        return [f"missing {_rel(package_json_path)}"]

    try:
        scripts = json.loads(package_json_path.read_text(encoding="utf-8")).get("scripts", {})
    except json.JSONDecodeError as error:
        return [f"{_rel(package_json_path)} is not valid JSON: {error}"]

    for rel_doc in ["AGENTS.md", "apps/admin-frontend/AGENTS.md"]:
        doc_path = REPO_ROOT / rel_doc
        if not doc_path.is_file():
            continue
        text = doc_path.read_text(encoding="utf-8")
        for match in NPM_RUN_PATTERN.finditer(text):
            script_name = match.group(1)
            if script_name not in scripts:
                problems.append(f"{rel_doc} documents 'npm run {script_name}' which is not in {_rel(package_json_path)}'s scripts")

    return problems


def _rel(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


CHECKS = [
    ("AGENTS.md files present", check_agents_md_exists),
    ("CLAUDE.md files import @AGENTS.md", check_claude_md_imports),
    ("canonical skill frontmatter valid", check_skill_frontmatter),
    ("skills synced to .agents/ and .claude/", check_skills_synced),
    ("no .codex/skills distribution dir", check_no_codex_skills_dir),
    ("ADR references resolve", check_adr_references),
    ("referenced scripts exist", check_referenced_scripts_exist),
    ("documented npm commands exist", check_documented_npm_commands),
]


def run_checks(repo_root: Path | None = None) -> list[str]:
    """Run every check and return the flat list of problems found. repo_root
    is accepted for test-friendliness but this module's checks are wired to
    the real REPO_ROOT constant above (tests instead monkeypatch the module
    constants - see scripts/tests/test_check_agent_governance.py)."""
    del repo_root
    problems: list[str] = []
    for _, check in CHECKS:
        problems.extend(check())
    return problems


def main(argv: list[str] | None = None) -> int:
    del argv
    any_problems = False
    for label, check in CHECKS:
        problems = check()
        if problems:
            any_problems = True
            print(f"[FAIL] {label}")
            for problem in problems:
                print(f"  - {problem}")
        else:
            print(f"[ OK ] {label}")

    if any_problems:
        print("\nGovernance check failed.")
        return 1

    print("\nGovernance check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
