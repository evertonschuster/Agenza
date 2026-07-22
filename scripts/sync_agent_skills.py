#!/usr/bin/env python3
"""Sync agent-skills/ (the single editable skill source) into the two
tool-specific distribution directories: .agents/skills/ (OpenAI Codex) and
.claude/skills/ (Claude Code).

Comparison is by content hash, never by timestamp or file mtime, so a
checkout/rebase that only touches mtimes never reports a false divergence.

Usage:
    python scripts/sync_agent_skills.py            # sync (writes files)
    python scripts/sync_agent_skills.py --check     # verify only, no writes

Exit code: 0 if in sync (after syncing, or already in sync for --check),
1 on any divergence found in --check mode or on a hard error (e.g. missing
source directory).
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "agent-skills"
TARGET_DIRS = [
    REPO_ROOT / ".agents" / "skills",
    REPO_ROOT / ".claude" / "skills",
]


def _relative_files(base: Path) -> dict[Path, str]:
    """Map every file under base (relative path -> sha256 hex digest)."""
    if not base.exists():
        return {}
    result: dict[Path, str] = {}
    for path in base.rglob("*"):
        if path.is_file():
            result[path.relative_to(base)] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def diff_target(source_dir: Path, target_dir: Path) -> tuple[list[Path], list[Path], list[Path]]:
    """Return (missing, divergent, extra) relative paths, all sorted."""
    source_files = _relative_files(source_dir)
    target_files = _relative_files(target_dir)

    missing = sorted(rel for rel in source_files if rel not in target_files)
    divergent = sorted(
        rel for rel in source_files if rel in target_files and source_files[rel] != target_files[rel]
    )
    extra = sorted(rel for rel in target_files if rel not in source_files)
    return missing, divergent, extra


def sync_target(source_dir: Path, target_dir: Path) -> bool:
    """Make target_dir match source_dir exactly. Returns True if anything changed."""
    missing, divergent, extra = diff_target(source_dir, target_dir)
    changed = bool(missing or divergent or extra)

    for rel in missing + divergent:
        dest = target_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_dir / rel, dest)

    for rel in extra:
        stale = target_dir / rel
        if stale.exists():
            stale.unlink()

    if target_dir.exists():
        # Remove directories left empty by the deletions above, deepest first.
        for directory in sorted((p for p in target_dir.rglob("*") if p.is_dir()), reverse=True):
            try:
                next(directory.iterdir())
            except StopIteration:
                directory.rmdir()

    return changed


def _print_diff(label: str, missing: list[Path], divergent: list[Path], extra: list[Path]) -> None:
    print(f"[{label}] out of sync:")
    for rel in missing:
        print(f"  missing:   {rel.as_posix()}")
    for rel in divergent:
        print(f"  divergent: {rel.as_posix()}")
    for rel in extra:
        print(f"  extra:     {rel.as_posix()}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify sync only; make no changes; exit non-zero on divergence",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=SOURCE_DIR,
        help="canonical skills source directory (default: agent-skills/)",
    )
    parser.add_argument(
        "--targets",
        type=Path,
        nargs="*",
        default=None,
        help="override the distribution target directories (default: .agents/skills, .claude/skills)",
    )
    args = parser.parse_args(argv)

    source_dir: Path = args.source
    targets: list[Path] = args.targets if args.targets else TARGET_DIRS

    if not source_dir.exists():
        print(f"error: canonical skills source not found: {source_dir}", file=sys.stderr)
        return 1

    exit_code = 0
    for target_dir in targets:
        label = _display_path(target_dir)
        if args.check:
            missing, divergent, extra = diff_target(source_dir, target_dir)
            if missing or divergent or extra:
                exit_code = 1
                _print_diff(label, missing, divergent, extra)
            else:
                print(f"[{label}] in sync.")
        else:
            changed = sync_target(source_dir, target_dir)
            print(f"[{label}] {'updated' if changed else 'already in sync'}.")

    return exit_code


def _display_path(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


if __name__ == "__main__":
    sys.exit(main())
