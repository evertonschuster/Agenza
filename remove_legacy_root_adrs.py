#!/usr/bin/env python3
"""Remove the legacy repository-wide docs/adr history while preserving
apps/admin-frontend/docs/adr and its local references.

Run from the Agenza repository root:
    python remove_legacy_root_adrs.py --apply

The script only changes the current working tree. It does not rewrite Git
history and does not commit anything.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

ROOT_MARKERS = ("AGENTS.md", "scripts/architecture_guard.py", "apps/admin-frontend")
FRONTEND_PREFIX = "apps/admin-frontend/"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str, dry_run: bool, changed: list[str]) -> None:
    old = read(path)
    if text == old:
        return
    changed.append(path.as_posix())
    if not dry_run:
        path.write_text(text, encoding="utf-8")


def replace_required(text: str, old: str, new: str, path: Path) -> str:
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old!r}")
    return text.replace(old, new)


def remove_method(text: str, method_name: str, path: Path) -> str:
    pattern = re.compile(
        rf"\n    def {re.escape(method_name)}\(self\).*?(?=\n    def |\nif __name__|\Z)",
        re.DOTALL,
    )
    updated, count = pattern.subn("", text, count=1)
    if count != 1:
        raise RuntimeError(f"Could not remove {method_name} from {path}")
    return updated


def remove_top_level_function(text: str, function_name: str, path: Path) -> str:
    pattern = re.compile(
        rf"\ndef {re.escape(function_name)}\([^\n]*\).*?(?=\ndef |\n# -{{20,}}|\nCHECKS\s*=|\Z)",
        re.DOTALL,
    )
    updated, count = pattern.subn("\n", text, count=1)
    if count != 1:
        raise RuntimeError(f"Could not remove {function_name} from {path}")
    return updated


def clean_agents(root: Path, dry_run: bool, changed: list[str]) -> None:
    path = root / "AGENTS.md"
    text = read(path)
    text = replace_required(
        text,
        "Open a living document or ADR only when the task needs it. Never preload all\n"
        "skills, all docs, or all ADRs.\n",
        "Open additional living documentation only when the task needs it. Never preload\n"
        "all skills or the full documentation tree.\n",
        path,
    )
    text = replace_required(
        text,
        "4. accepted ADRs routed by the relevant ADR index;\n"
        "5. superseded ADRs and historical examples, which are context only.\n",
        "4. frontend ADRs only when a frontend task is explicitly routed to them.\n",
        path,
    )
    text = replace_required(
        text,
        "| Decisions | the relevant `docs/adr/README.md` index first |",
        "| Frontend decisions | `apps/admin-frontend/docs/adr/README.md` when relevant |",
        path,
    )
    text = text.replace(
        "Do not add a parallel Compose/Dockerfile runtime without a deployment ADR.",
        "Do not add a parallel Compose/Dockerfile runtime without an approved deployment design.",
    )
    text = text.replace(
        "- durable architectural rationale: an ADR;",
        "- durable frontend rationale: the frontend ADR index when needed;",
    )
    write(path, text, dry_run, changed)

    path = root / "backend/AGENTS.md"
    text = read(path)
    text = replace_required(
        text,
        "files, and `Directory.Packages.props`; decision history is routed through\n"
        "[../docs/adr/README.md](../docs/adr/README.md).\n",
        "files, and `Directory.Packages.props`. Current code, tests, configuration, and\n"
        "living documentation are the source of truth.\n",
        path,
    )
    text = text.replace(
        "Inspect the closest live slice and tests before opening historical ADR content.",
        "Inspect the closest live slice and tests before opening broader documentation.",
    )
    text = text.replace(
        "Do not recreate broad integration suites without an ADR backed by concrete\n"
        "  failure evidence.",
        "Do not recreate broad integration suites without concrete failure evidence and\n"
        "  an approved test design.",
    )
    write(path, text, dry_run, changed)


def clean_living_docs(root: Path, dry_run: bool, changed: list[str]) -> None:
    path = root / "docs/AGENT-GOVERNANCE.md"
    text = read(path)
    text = text.replace(
        "├── */docs/adr/README.md            decision routing",
        "├── apps/admin-frontend/docs/adr/README.md  frontend decision routing",
    )
    text = text.replace(
        "- ADRs: durable rationale and history; the index identifies current versus\n"
        "  superseded decisions.\n",
        "- Frontend ADRs: scoped rationale for the admin frontend only.\n",
    )
    text = text.replace(
        "skill, fix the concrete code/documentation, add an ADR only for a durable\n"
        "architectural choice, and add a regression test/guard when the rule is\n",
        "skill, fix the concrete code/documentation, add a frontend ADR only for a\n"
        "durable frontend choice, and add a regression test/guard when the rule is\n",
    )
    write(path, text, dry_run, changed)

    path = root / "docs/MONOREPO.md"
    text = read(path)
    text = text.replace(
        "└── docs/                      cross-cutting living docs and ADR index",
        "└── docs/                      cross-cutting living documentation",
    )
    text = text.replace(
        "one-shot step. ADR 0028 reset pre-deployment migration histories, so old local\n"
        "volumes are intentionally disposable rather than supported by a data-upgrade\n"
        "path.",
        "one-shot step. The current pre-deployment migration history treats old local\n"
        "volumes as disposable rather than supporting a data-upgrade path.",
    )
    write(path, text, dry_run, changed)


def clean_skills(root: Path, dry_run: bool, changed: list[str]) -> None:
    path = root / ".agents/skills/agenza-architecture-review/SKILL.md"
    text = read(path)
    text = text.replace(
        "and only the ADR indexes relevant to observed concerns.",
        "and only the living documentation relevant to observed concerns.",
    )
    text = text.replace(
        "3. living status/API/layout docs;\n"
        "4. accepted ADRs;\n"
        "5. historical ADR content only when explaining how drift occurred.\n",
        "3. living status, API, and layout documentation;\n"
        "4. scoped frontend ADRs only for frontend-specific rationale.\n",
    )
    write(path, text, dry_run, changed)

    source = root / ".agents/skills"
    target = root / ".claude/skills"
    if not dry_run:
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source, target)
    changed.append(".claude/skills/ (resynced from .agents/skills/)")


def clean_governance_script(root: Path, dry_run: bool, changed: list[str]) -> None:
    path = root / "scripts/check_agent_governance.py"
    text = read(path)
    text = text.replace(
        "- Every docs/adr/NNNN reference mentioned in a governance file resolves to\n"
        "  a real ADR file.\n",
        "",
    )
    text = text.replace('ADR_REF_PATTERN = re.compile(r"docs/adr/(\\d{4})")\n', "")
    text = text.replace(
        '        "runtime pins and docs/adr/0032 are the executable version sources"',
        '        "runtime pins and live project files are the executable version sources"',
    )
    text = text.replace(
        '    """Every file that might reasonably cite a docs/adr/NNNN or scripts/*.py\n'
        '    reference: the fixed governance docs/CLAUDE.md files, plus every\n',
        '    """Every file that might reasonably cite a scripts/*.py or skill\n'
        '    reference: the fixed governance docs/CLAUDE.md files, plus every\n',
    )
    text = remove_top_level_function(text, "check_adr_references", path)
    text = text.replace('    ("ADR references resolve", check_adr_references),\n', "")
    write(path, text, dry_run, changed)

    path = root / "scripts/tests/test_check_agent_governance.py"
    text = read(path)
    for name in (
        "test_dangling_adr_reference_is_reported",
        "test_valid_adr_reference_passes",
        "test_missing_adr_reference_in_skill_is_reported",
    ):
        text = remove_method(text, name, path)
    text = text.replace("    # -- ADR references ----------------------------------------------------\n", "")
    text = text.replace(r'        self._write("docs/adr/0001-something.md", "# ADR\n")' + "\n", "")
    write(path, text, dry_run, changed)


def clean_architecture_guard(root: Path, dry_run: bool, changed: list[str]) -> None:
    path = root / "scripts/architecture_guard.py"
    text = read(path)
    replacements = {
        "codebase already tried and formally reverted (docs/adr/0012, docs/adr/0014)\n"
        "or explicitly decided against (docs/adr/0005, root AGENTS.md).":
        "codebase explicitly prohibits through current instructions and executable\n"
        "architecture rules.",
        "# Backend checks (docs/adr/0012, docs/adr/0014)": "# Backend architecture checks",
        "DuplicateEntityException and BusinessExceptionHandler were deleted by\n"
        "    docs/adr/0014 - a unique-constraint race now returns PersistenceResult,":
        "DuplicateEntityException and BusinessExceptionHandler are not part of the\n"
        "    current error flow - a unique-constraint race returns PersistenceResult,",
        "DuplicateEntityException was deleted by docs/adr/0014 (PersistenceResult replaces it) - do not reintroduce it.":
        "DuplicateEntityException is not part of the current error flow; use PersistenceResult.",
        "BusinessExceptionHandler was deleted by docs/adr/0014 - GenericExceptionHandler is the only exception handler now.":
        "BusinessExceptionHandler is not part of the current error flow; GenericExceptionHandler is the only exception handler.",
        "treats as an expected, Result-carrying outcome (docs/adr/0014).":
        "treats as an expected, Result-carrying outcome.",
        "ValidateAndThrow() throws for a validation failure - this repo returns Result/DomainResult instead (docs/adr/0014).":
        "ValidateAndThrow() throws for a validation failure; this repo returns Result/DomainResult instead.",
        "docs/adr/0012 reverted repository-dependent validators - a Validator":
        "Repository-dependent validators are prohibited: a Validator",
        "docs/adr/0012 moved cross-aggregate checks to the handler; validators ":
        "cross-aggregate checks belong in the handler; validators ",
        "synchronous shape checks only; a repository round-trip belongs in the handler (docs/adr/0012).":
        "synchronous shape checks only; a repository round-trip belongs in the handler.",
        "throwing for an invalid value (docs/adr/0014). A `throw new` inside\n"
        "    Domain/Entities/*.cs is the pre-ADR-0014 shape.":
        "throwing for an invalid value. A `throw new` inside\n"
        "    Domain/Entities/*.cs violates the current Result-based domain flow.",
        "DomainResult/DomainResult<T> and let the handler map the failure (docs/adr/0014).":
        "DomainResult/DomainResult<T> and let the handler map the failure.",
        "is the pre-ADR-0012 shape, which assumed a validator had already":
        "assumes a validator has already",
        "the lookup itself rather than assuming a validator already guaranteed existence (docs/adr/0012).":
        "the lookup itself rather than assuming a validator already guaranteed existence.",
        "# Security and operability fitness functions (docs/adr/0022-0030)":
        "# Security and operability fitness functions",
        "(docs/adr/0022).": "under the current tenant-boundary policy.",
        "Aspire-only local runtime decision (docs/adr/0029).":
        "current Aspire-only local runtime policy.",
        "ADR 0031 removes repository-owned Git hooks and lint-staged ":
        "Current repository policy excludes repository-owned Git hooks and lint-staged ",
        "ADR 0031 removes Husky and lint-staged from repository ":
        "Current repository policy excludes Husky and lint-staged from repository ",
        "ADR 0031 removes the Husky installation script.":
        "Current repository policy excludes the Husky installation script.",
        "ADR 0026 removed the Testcontainers/WebApplicationFactory tier.\n"
        "    Reintroducing it requires an explicit architecture decision.":
        "The current test strategy excludes a Testcontainers/WebApplicationFactory tier.\n"
        "    Reintroducing it requires concrete failure evidence and an approved design.",
        "A RuntimeTests project reintroduces the tier removed by docs/adr/0026; ":
        "A RuntimeTests project conflicts with the current test strategy; ",
        "record concrete failure evidence and a new ADR before restoring it.":
        "record concrete failure evidence and approve the design before restoring it.",
        "AdminBackend.slnx references a RuntimeTests project removed by \n"
        "                        docs/adr/0026.":
        "AdminBackend.slnx references a RuntimeTests project excluded by the current test strategy.",
        "belongs to the runtime-test tier removed by \n"
        "                        docs/adr/0026.":
        "belongs to a runtime-test tier excluded by the current test strategy.",
        "Base configuration must set DatabaseBootstrap:RunOnStartup to false \n"
        "                    (docs/adr/0025).":
        "Base configuration must set DatabaseBootstrap:RunOnStartup to false.",
        "ADR 0027 keeps the demo bootstrap single-instance and rejects a\n"
        "    speculative distributed lock until a deployment driver exists.":
        "The demo bootstrap remains single-instance and rejects a speculative\n"
        "    distributed lock until a deployment driver exists.",
        "PostgreSQL advisory bootstrap locking was removed by docs/adr/0027; ":
        "PostgreSQL advisory bootstrap locking is outside the current design; ",
        "(docs/adr/0024).": "under the current database-boundary policy.",
        "preflight/backfill/rollback review (docs/adr/0025).":
        "preflight/backfill/rollback review.",
        "taught MustAsync-with-repository years after docs/adr/0012 reverted it.\n"
        "    Scan only code fences, and skip docs/adr/ (historical record) and any":
        "taught MustAsync-with-repository after the rule had changed.\n"
        "    Scan only code fences, and skip scoped docs/adr/ records and any",
        "f\"Code block contains '{needle}', a pattern reverted by docs/adr/0014 - \"":
        "f\"Code block contains '{needle}', a prohibited stale pattern - \"",
        "Code block mixes a Validator with MustAsync/CustomAsync - docs/adr/0012 moved ":
        "Code block mixes a Validator with MustAsync/CustomAsync - ",
        "ADR 009: a feature's domain/application/infrastructure/presentation is":
        "The current frontend architecture requires that a feature's domain/application/infrastructure/presentation is",
        "(@/features/{feature}) instead (ADR 009).":
        "(@/features/{feature}) instead, following the current frontend public-API rule.",
        "ADR 009 replaced the horizontal domain/application/infrastructure/":
        "The current frontend architecture replaced the horizontal domain/application/infrastructure/",
        "pre-ADR-009 horizontal layout": "obsolete horizontal layout",
        "ADR 009 relocated the generated OpenAPI client from the pre-move":
        "The current frontend architecture locates the generated OpenAPI client away from the old",
        "pre-ADR-009 src/infrastructure/generated/ path":
        "obsolete src/infrastructure/generated/ path",
        "pre-ADR-009 src/infrastructure/generated/":
        "obsolete src/infrastructure/generated/",
    }
    for old, new in replacements.items():
        if old not in text:
            # Some replacements span formatting that may differ. Skip only the
            # long, formatting-sensitive ones; residual scan catches misses.
            if "RuntimeTests" in old or "Base configuration" in old or "belongs to" in old:
                continue
            raise RuntimeError(f"Expected architecture_guard text not found: {old!r}")
        text = text.replace(old, new)

    # Formatting-sensitive residual replacements.
    text = re.sub(
        r'"AdminBackend\.slnx references a RuntimeTests project removed by "\s*\n\s*"docs/adr/0026\."',
        '"AdminBackend.slnx references a RuntimeTests project excluded by the current test strategy."',
        text,
    )
    text = re.sub(
        r'f"\{package\} belongs to the runtime-test tier removed by "\s*\n\s*"docs/adr/0026\."',
        'f"{package} belongs to a runtime-test tier excluded by the current test strategy."',
        text,
    )
    text = re.sub(
        r'"Base configuration must set DatabaseBootstrap:RunOnStartup to false "\s*\n\s*"\(docs/adr/0025\)\."',
        '"Base configuration must set DatabaseBootstrap:RunOnStartup to false."',
        text,
    )

    text = remove_top_level_function(text, "check_dangling_adr_references", path)
    text = text.replace("    check_dangling_adr_references,\n", "")
    write(path, text, dry_run, changed)

    path = root / "scripts/tests/test_architecture_guard.py"
    text = read(path)
    text = remove_method(text, "test_dangling_adr_reference_in_source_is_info_only", path)
    text = text.replace(
        "    # -- dangling ADR references (info only) -----------------------------------\n",
        "",
    )
    text = text.replace(
        r"Never write `DuplicateEntityException` - it was deleted by docs/adr/0014.\n",
        r"Never write `DuplicateEntityException`; use the current Result flow.\n",
    )
    text = text.replace(
        '"docs/adr/0099-historical.md",',
        '"apps/admin-frontend/docs/adr/099-historical.md",',
    )
    text = text.replace(
        "def test_adr_directory_is_skipped",
        "def test_frontend_adr_directory_is_skipped",
    )
    text = text.replace(
        r"The old path was `src/infrastructure/generated/services-api.d.ts`, moved by ADR 009.\n",
        r"The old path was `src/infrastructure/generated/services-api.d.ts`, moved by the current frontend architecture.\n",
    )
    text = text.replace(
        '"docs/adr/0009-feature-based-modularization.md",',
        '"apps/admin-frontend/docs/adr/009-feature-based-modularization.md",',
    )
    text = text.replace("(ADR 009)", "(frontend architecture)")
    write(path, text, dry_run, changed)


def clean_backend_references(root: Path, dry_run: bool, changed: list[str]) -> None:
    allowed_suffixes = {".cs", ".csproj", ".props", ".md", ".py"}
    for path in sorted((root / "backend").rglob("*")):
        if not path.is_file() or path.suffix not in allowed_suffixes:
            continue
        text = read(path)
        if "docs/adr" not in text and not re.search(r"\bADR\s+00\d{2}\b", text):
            continue
        updated = text
        # Remove parenthetical citations, including short explanatory fragments.
        updated = re.sub(r"\s*\([^()\n]*docs/adr/[^()\n]*\)", "", updated)
        # Replace remaining bare references with neutral current-state wording.
        updated = re.sub(r"docs/adr/\d{4}(?:-[A-Za-z0-9-]+)?", "the current architecture", updated)
        updated = re.sub(r"\bADR\s+00\d{2}\b", "the current architecture", updated)
        updated = updated.replace("the current architecture-revert", "a reverted design")
        updated = updated.replace("see the current architecture", "see the current architecture rules")
        updated = re.sub(r"[ \t]+\n", "\n", updated)
        write(path, updated, dry_run, changed)


def residual_references(root: Path) -> list[tuple[str, int, str]]:
    hits: list[tuple[str, int, str]] = []
    excluded = {".git", "node_modules", "bin", "obj", "dist", "coverage"}
    pattern = re.compile(
        r"docs[/\\]adr[/\\][0-9]{4}|ADR[-_ ]?00[0-9]{2}|architecture decision record",
        re.IGNORECASE,
    )
    for path in sorted(root.rglob("*")):
        if not path.is_file() or any(part in excluded for part in path.parts):
            continue
        rel = path.relative_to(root).as_posix()
        if rel.startswith(FRONTEND_PREFIX) or rel == Path(__file__).name:
            continue
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(lines, 1):
            if pattern.search(line):
                hits.append((rel, number, line.strip()))
    return hits


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write changes; default is dry-run")
    args = parser.parse_args()

    root = Path.cwd().resolve()
    missing = [marker for marker in ROOT_MARKERS if not (root / marker).exists()]
    if missing:
        print("Run this script from the Agenza repository root.", file=sys.stderr)
        print("Missing markers:", ", ".join(missing), file=sys.stderr)
        return 2

    dry_run = not args.apply
    changed: list[str] = []

    adr_dir = root / "docs/adr"
    if adr_dir.exists():
        changed.append("docs/adr/ (deleted)")
        if not dry_run:
            shutil.rmtree(adr_dir)

    clean_agents(root, dry_run, changed)
    clean_living_docs(root, dry_run, changed)
    clean_skills(root, dry_run, changed)
    clean_governance_script(root, dry_run, changed)
    clean_architecture_guard(root, dry_run, changed)
    clean_backend_references(root, dry_run, changed)

    mode = "DRY RUN" if dry_run else "APPLIED"
    print(f"[{mode}] Planned/changed paths: {len(changed)}")
    for item in changed:
        print(f" - {item}")

    if not dry_run:
        hits = residual_references(root)
        if hits:
            print("\nRemaining non-frontend ADR-like references:")
            for rel, line, content in hits:
                print(f"{rel}:{line}: {content}")
            return 1
        print("\nNo non-frontend ADR references remain.")
        print("Frontend ADRs under apps/admin-frontend/docs/adr were preserved.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
