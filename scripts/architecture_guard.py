#!/usr/bin/env python3
"""Conservative, regex-based guard against architecture patterns this
codebase already tried and formally reverted (docs/adr/0012, docs/adr/0014)
or explicitly decided against (docs/adr/0005, root AGENTS.md). This is not
a general-purpose linter — it exists specifically to stop an agent (or a
human) from silently reintroducing a bug that was already fixed once.

Every check here is deliberately narrow and documented with *why* it
exists, to keep false positives rare (a guard nobody trusts gets ignored).
When a check needs an exception, add it to the small, explicit ALLOWLIST
below with a one-line reason — never widen a whole directory.

Usage:
    python scripts/architecture_guard.py              # fails on any BLOCKING finding
    python scripts/architecture_guard.py --inventory   # lists every finding (blocking + info), always exits 0

Exit code: 0 if no BLOCKING finding (or --inventory mode), 1 otherwise.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Explicit, small, documented allowlist. Each entry: (relative file path,
# reason). Extend this only for a genuine, reviewed exception - never widen
# a whole directory.
ALLOWLIST: dict[str, str] = {}

EXCLUDED_DIR_NAMES = {
    "bin",
    "obj",
    "node_modules",
    ".git",
    "dist",
    "coverage",
    "generated",
    "worktrees",
}


@dataclass
class Finding:
    category: str  # short machine-readable check id
    severity: str  # "blocking" or "info"
    file: str
    line: int
    message: str


def _iter_files(base: Path, suffixes: tuple[str, ...]) -> list[Path]:
    if not base.exists():
        return []
    results = []
    for path in base.rglob("*"):
        if not path.is_file() or path.suffix not in suffixes:
            continue
        if any(part in EXCLUDED_DIR_NAMES for part in path.parts):
            continue
        results.append(path)
    return sorted(results)


def _rel(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _is_allowlisted(path: Path) -> bool:
    return _rel(path) in ALLOWLIST


def _findings_for_pattern(
    files: list[Path], pattern: re.Pattern[str], category: str, severity: str, message: str
) -> list[Finding]:
    findings = []
    for path in files:
        if _is_allowlisted(path):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if pattern.search(line):
                findings.append(Finding(category, severity, _rel(path), line_number, message))
    return findings


# ---------------------------------------------------------------------------
# Backend checks (docs/adr/0012, docs/adr/0014)
# ---------------------------------------------------------------------------

def check_deleted_exception_types() -> list[Finding]:
    """DuplicateEntityException and BusinessExceptionHandler were deleted by
    docs/adr/0014 - a unique-constraint race now returns PersistenceResult,
    and GenericExceptionHandler is the only exception handler. Either name
    reappearing means the reverted pattern is coming back."""
    cs_files = _iter_files(REPO_ROOT / "backend", (".cs",))
    findings = []
    findings += _findings_for_pattern(
        cs_files,
        re.compile(r"\bDuplicateEntityException\b"),
        "deleted-exception-type",
        "blocking",
        "DuplicateEntityException was deleted by docs/adr/0014 (PersistenceResult replaces it) - do not reintroduce it.",
    )
    findings += _findings_for_pattern(
        cs_files,
        re.compile(r"\bBusinessExceptionHandler\b"),
        "deleted-exception-type",
        "blocking",
        "BusinessExceptionHandler was deleted by docs/adr/0014 - GenericExceptionHandler is the only exception handler now.",
    )
    return findings


def check_validate_and_throw() -> list[Finding]:
    """ValidateAndThrow() throws a ValidationException for what this repo
    treats as an expected, Result-carrying outcome (docs/adr/0014)."""
    cs_files = _iter_files(REPO_ROOT / "backend", (".cs",))
    return _findings_for_pattern(
        cs_files,
        re.compile(r"\bValidateAndThrow\s*\("),
        "validate-and-throw",
        "blocking",
        "ValidateAndThrow() throws for a validation failure - this repo returns Result/DomainResult instead (docs/adr/0014).",
    )


def check_validator_repository_dependency() -> list[Finding]:
    """docs/adr/0012 reverted repository-dependent validators - a Validator
    in this repo takes no repository/unit-of-work dependency and has no
    async rule. Constructor injection of a repository, or a MustAsync/
    CustomAsync rule, is the exact pattern that was reverted."""
    validator_files = [
        p for p in _iter_files(REPO_ROOT / "backend", (".cs",)) if p.name.endswith("Validator.cs")
    ]
    findings = []
    repo_ctor_pattern = re.compile(r"\bI\w*(Repository|UnitOfWork)\b")
    async_rule_pattern = re.compile(r"\b(MustAsync|CustomAsync)\s*\(")
    for path in validator_files:
        if _is_allowlisted(path):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        constructor_pattern = re.compile(rf"\b{re.escape(path.stem)}\s*\(")
        in_ctor_signature = False
        for line_number, line in enumerate(lines, start=1):
            if constructor_pattern.search(line):
                in_ctor_signature = True
            if in_ctor_signature and repo_ctor_pattern.search(line):
                findings.append(
                    Finding(
                        "validator-repository-dependency",
                        "blocking",
                        _rel(path),
                        line_number,
                        "Validator constructor takes a repository/IUnitOfWork dependency - "
                        "docs/adr/0012 moved cross-aggregate checks to the handler; validators "
                        "here are shape-only and take no dependencies.",
                    )
                )
            if ")" in line and in_ctor_signature:
                in_ctor_signature = False
            if async_rule_pattern.search(line):
                findings.append(
                    Finding(
                        "validator-async-repository-rule",
                        "blocking",
                        _rel(path),
                        line_number,
                        "MustAsync/CustomAsync in a validator - this repo's validators are "
                        "synchronous shape checks only; a repository round-trip belongs in the handler (docs/adr/0012).",
                    )
                )
    return findings


def check_domain_entity_throws() -> list[Finding]:
    """Domain entities return DomainResult from Create/Update instead of
    throwing for an invalid value (docs/adr/0014). A `throw new` inside
    Domain/Entities/*.cs is the pre-ADR-0014 shape. Project folders are
    named "{Service}.Domain" (e.g. ServicesService.Domain), not literally
    "Domain" - matched by suffix, not by an exact path segment."""
    entity_files = [
        p
        for p in _iter_files(REPO_ROOT / "backend", (".cs",))
        if re.search(r"\.Domain/Entities/", p.as_posix().replace("\\", "/"))
    ]
    return _findings_for_pattern(
        entity_files,
        re.compile(r"\bthrow\s+new\b"),
        "domain-entity-throws",
        "blocking",
        "Domain entity throws instead of returning DomainResult - Create/Update must return "
        "DomainResult/DomainResult<T> and let the handler map the failure (docs/adr/0014).",
    )


def check_dangling_null_forgiving_after_lookup() -> list[Finding]:
    """A null-forgiving `!` chained directly onto a GetByIdAsync(...) call
    is the pre-ADR-0012 shape, which assumed a validator had already
    guaranteed existence. Handlers here fetch and null-check themselves.
    Informational only - the heuristic can't tell a genuinely-impossible
    null (e.g. right after an Add() on the same aggregate) from a real risk."""
    handler_files = [
        p for p in _iter_files(REPO_ROOT / "backend", (".cs",)) if p.name.endswith("Handler.cs")
    ]
    return _findings_for_pattern(
        handler_files,
        re.compile(r"GetByIdAsync\([^)]*\)\s*\)\s*!"),
        "null-forgiving-after-lookup",
        "info",
        "Null-forgiving '!' directly on a GetByIdAsync(...) result - verify this handler null-checks "
        "the lookup itself rather than assuming a validator already guaranteed existence (docs/adr/0012).",
    )


# ---------------------------------------------------------------------------
# Documentation checks - stale patterns inside copy-paste code blocks
# ---------------------------------------------------------------------------

_FENCE_PATTERN = re.compile(r"```[\w-]*\n(.*?)```", re.DOTALL)


def _code_blocks(markdown_path: Path) -> list[tuple[int, str]]:
    """Return (first_content_line_number, code_text) for every fenced code
    block. +2, not +1: match.start() is the opening ``` line itself, and
    the capture group's content starts on the line right after it."""
    text = markdown_path.read_text(encoding="utf-8", errors="replace")
    blocks = []
    for match in _FENCE_PATTERN.finditer(text):
        start_line = text.count("\n", 0, match.start()) + 2
        blocks.append((start_line, match.group(1)))
    return blocks


def check_stale_patterns_in_doc_code_blocks() -> list[Finding]:
    """A prose sentence can correctly *describe* a banned pattern (e.g. this
    very script's docstring). A fenced code block presented as something to
    copy is different - that's exactly how the old backend-use-case skill
    taught MustAsync-with-repository years after docs/adr/0012 reverted it.
    Scan only code fences, and skip docs/adr/ (historical record) and any
    file whose own frontmatter marks it OBSOLETE (redirect stubs explain
    the old, wrong pattern by name on purpose)."""
    findings: list[Finding] = []
    md_files = [
        p
        for p in REPO_ROOT.rglob("*.md")
        if not any(part in EXCLUDED_DIR_NAMES for part in p.parts)
        and "docs/adr" not in p.as_posix().replace("\\", "/")
    ]

    banned_bare = ["DuplicateEntityException", "BusinessExceptionHandler", "ValidateAndThrow("]

    for path in md_files:
        if _is_allowlisted(path):
            continue
        head = path.read_text(encoding="utf-8", errors="replace")[:400]
        if "OBSOLETE" in head:
            continue

        for start_line, code in _code_blocks(path):
            for needle in banned_bare:
                if needle in code:
                    offset = code.split(needle)[0].count("\n")
                    findings.append(
                        Finding(
                            "stale-pattern-in-doc-code-block",
                            "blocking",
                            _rel(path),
                            start_line + offset,
                            f"Code block contains '{needle}', a pattern reverted by docs/adr/0014 - "
                            "fix the template, don't just fix the prose around it.",
                        )
                    )
            if "Validator" in code and re.search(r"\b(MustAsync|CustomAsync)\s*\(", code):
                findings.append(
                    Finding(
                        "stale-pattern-in-doc-code-block",
                        "blocking",
                        _rel(path),
                        start_line,
                        "Code block mixes a Validator with MustAsync/CustomAsync - docs/adr/0012 moved "
                        "repository-backed checks to the handler; validators take no async rule.",
                    )
                )

    return findings


def check_dangling_adr_references() -> list[Finding]:
    """A source comment citing docs/adr/NNNN where NNNN doesn't exist - this
    exact class of bug (14 references to a non-existent ADR 0013) was found
    and fixed in this repo once already (see docs/HARDENING_REPORT.md)."""
    adr_dir = REPO_ROOT / "docs" / "adr"
    existing = set()
    if adr_dir.is_dir():
        for path in adr_dir.glob("*.md"):
            match = re.match(r"(\d{4})-", path.name)
            if match:
                existing.add(match.group(1))

    pattern = re.compile(r"docs/adr/(\d{4})")
    findings = []
    source_files = _iter_files(REPO_ROOT / "backend", (".cs",)) + _iter_files(
        REPO_ROOT / "apps" / "admin-frontend" / "src", (".ts", ".tsx")
    )
    for path in source_files:
        if _is_allowlisted(path):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for line_number, line in enumerate(text.splitlines(), start=1):
            for match in pattern.finditer(line):
                if match.group(1) not in existing:
                    findings.append(
                        Finding(
                            "dangling-adr-reference",
                            "info",
                            _rel(path),
                            line_number,
                            f"References docs/adr/{match.group(1)}, which does not exist.",
                        )
                    )
    return findings


# ---------------------------------------------------------------------------
# Frontend checks
# ---------------------------------------------------------------------------

def check_frontend_any() -> list[Finding]:
    """Root AGENTS.md / apps/admin-frontend/AGENTS.md: strict: true, no any,
    ever - including tests and fakes. Excludes the generated OpenAPI client,
    which this repo doesn't hand-author."""
    src_dir = REPO_ROOT / "apps" / "admin-frontend" / "src"
    ts_files = [
        p
        for p in _iter_files(src_dir, (".ts", ".tsx"))
        if "infrastructure/generated" not in p.as_posix().replace("\\", "/")
    ]
    pattern = re.compile(r":\s*any\b|<any>|\bas\s+any\b")
    return _findings_for_pattern(
        ts_files,
        pattern,
        "frontend-any",
        "blocking",
        "Uses `any` - this project's TypeScript is strict with no `any`, anywhere (root AGENTS.md).",
    )


_FEATURE_INTERNAL_IMPORT_PATTERN = re.compile(
    r"""from\s+['"]@/features/(\w+)/(?:domain|application|infrastructure|presentation)/[^'"]*['"]"""
)


def check_cross_feature_internal_imports() -> list[Finding]:
    """ADR 009: a feature's domain/application/infrastructure/presentation is
    reached from outside that feature only through its own index.ts public
    API - never by importing past it into an internal module. Mirrors
    eslint.config.js's no-restricted-imports rule as an independent,
    tooling-agnostic check. src/test/** is exempt (MSW fixtures legitimately
    need a feature's internal DTOs); a feature's own files are exempt for
    their own internals."""
    src_dir = REPO_ROOT / "apps" / "admin-frontend" / "src"
    features_dir = src_dir / "features"
    if not features_dir.is_dir():
        return []
    feature_names = {d.name for d in features_dir.iterdir() if d.is_dir()}

    findings = []
    for path in _iter_files(src_dir, (".ts", ".tsx")):
        if _is_allowlisted(path):
            continue
        rel = path.relative_to(src_dir).as_posix()
        if rel.startswith("test/"):
            continue

        text = path.read_text(encoding="utf-8", errors="replace")
        for line_number, line in enumerate(text.splitlines(), start=1):
            match = _FEATURE_INTERNAL_IMPORT_PATTERN.search(line)
            if not match:
                continue
            feature = match.group(1)
            if feature not in feature_names or rel.startswith(f"features/{feature}/"):
                continue
            findings.append(
                Finding(
                    "cross-feature-internal-import",
                    "blocking",
                    _rel(path),
                    line_number,
                    f"Imports '{feature}' internals directly - use its public API "
                    f"(@/features/{feature}) instead (ADR 009).",
                )
            )
    return findings


def check_stale_horizontal_layout() -> list[Finding]:
    """ADR 009 replaced the horizontal domain/application/infrastructure/
    presentation/composition top-level layout with app/, features/*/,
    shared/. Any of those directories reappearing directly under src/ means
    the old layout is being reintroduced."""
    src_dir = REPO_ROOT / "apps" / "admin-frontend" / "src"
    findings = []
    for name in ["domain", "application", "infrastructure", "presentation", "composition"]:
        candidate = src_dir / name
        if candidate.is_dir() and not _is_allowlisted(candidate):
            findings.append(
                Finding(
                    "stale-horizontal-layout",
                    "blocking",
                    _rel(candidate),
                    1,
                    f"src/{name}/ reintroduces the pre-ADR-009 horizontal layout - "
                    "move its contents into app/, features/*/, or shared/ instead.",
                )
            )
    return findings


_STALE_OPENAPI_GENERATED_PATH = "src/infrastructure/generated"


def check_stale_openapi_generated_path() -> list[Finding]:
    """ADR 009 relocated the generated OpenAPI client from the pre-move
    top-level src/infrastructure/generated/ to src/features/catalog/
    infrastructure/generated/, but several consumers (package.json,
    checkGeneratedApiTypes.mjs, .prettierignore, skills, templates) kept
    pointing at the old path and generate:api-types:check silently
    ENOENT'd - this exact class of drift was found and fixed once already.
    Source/config files are checked in full; markdown is checked only
    inside fenced code blocks, mirroring
    check_stale_patterns_in_doc_code_blocks - a prose sentence can
    correctly describe the old path as history (e.g. this ADR's own
    'Execution' section) without teaching it as current."""
    findings: list[Finding] = []
    code_suffixes = (".ts", ".tsx", ".mjs", ".js", ".json", ".yml", ".yaml")
    candidate_names = {".prettierignore"}

    code_files = [
        p
        for p in REPO_ROOT.rglob("*")
        if p.is_file()
        and (p.suffix in code_suffixes or p.name in candidate_names)
        and not any(part in EXCLUDED_DIR_NAMES for part in p.parts)
    ]
    findings += _findings_for_pattern(
        code_files,
        re.compile(re.escape(_STALE_OPENAPI_GENERATED_PATH)),
        "stale-openapi-generated-path",
        "blocking",
        "References the pre-ADR-009 src/infrastructure/generated/ path - the generated "
        "OpenAPI client now lives at src/features/catalog/infrastructure/generated/.",
    )

    md_files = [
        p
        for p in REPO_ROOT.rglob("*.md")
        if not any(part in EXCLUDED_DIR_NAMES for part in p.parts)
        and "docs/adr" not in p.as_posix().replace("\\", "/")
    ]
    for path in md_files:
        if _is_allowlisted(path):
            continue
        for start_line, code in _code_blocks(path):
            if _STALE_OPENAPI_GENERATED_PATH in code:
                offset = code.split(_STALE_OPENAPI_GENERATED_PATH)[0].count("\n")
                findings.append(
                    Finding(
                        "stale-openapi-generated-path",
                        "blocking",
                        _rel(path),
                        start_line + offset,
                        "Code block references the pre-ADR-009 src/infrastructure/generated/ "
                        "path - the generated OpenAPI client now lives at "
                        "src/features/catalog/infrastructure/generated/.",
                    )
                )
    return findings


_ALLOWED_COVERAGE_EXCLUDE_PATTERNS = [
    re.compile(r"^node_modules/?$"),
    re.compile(r"^src/test/?$"),
    re.compile(r"^\*\*/\*\.config\.\{ts,js\}$"),
    re.compile(r"^\*\*/main\.tsx$"),
    re.compile(r"^\*\*/App\.tsx$"),
    re.compile(r"^src/app/routes/router\.tsx$"),
    re.compile(r"^src/app/pages/\w+/\*\*$"),
]


def check_coverage_exclude_allowlist() -> list[Finding]:
    """docs/QUALITY.md documents exactly what the frontend coverage gate may
    exclude: build wiring and not-yet-implemented stub pages. A new entry
    outside that shape usually means a feature is being hidden from the
    gate instead of tested - flag it instead of silently trusting it."""
    config_path = REPO_ROOT / "apps" / "admin-frontend" / "vitest.config.ts"
    if not config_path.is_file() or _is_allowlisted(config_path):
        return []

    text = config_path.read_text(encoding="utf-8")

    coverage_match = re.search(r"coverage:\s*\{", text)
    if not coverage_match:
        return []

    # Scope the exclude search to inside coverage's own object, found by
    # counting braces from its opening one - vitest.config.ts also has a
    # top-level `test.exclude` (which test *files* to collect, e.g. keeping
    # Playwright specs under e2e/ out of Vitest's run) that is unrelated to
    # what counts toward the coverage gate and must not be matched instead.
    brace_start = coverage_match.end() - 1
    depth = 0
    block_end = len(text)
    for index in range(brace_start, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                block_end = index + 1
                break
    coverage_block = text[brace_start:block_end]
    block_start_line = text.count("\n", 0, brace_start) + 1

    match = re.search(r"exclude:\s*\[(.*?)\]", coverage_block, re.DOTALL)
    if not match:
        return []

    findings = []
    entry_pattern = re.compile(r"""['"]([^'"]+)['"]""")
    block = match.group(1)
    start_line = block_start_line + coverage_block.count("\n", 0, match.start())
    for line_offset, line in enumerate(block.splitlines()):
        for entry_match in entry_pattern.finditer(line):
            entry = entry_match.group(1)
            if not any(pattern.match(entry) for pattern in _ALLOWED_COVERAGE_EXCLUDE_PATTERNS):
                findings.append(
                    Finding(
                        "coverage-exclude-drift",
                        "blocking",
                        _rel(config_path),
                        start_line + line_offset,
                        f"Coverage exclude entry '{entry}' is outside the documented allowlist "
                        "(docs/QUALITY.md) - widening this gate silently is prohibited; add a "
                        "reviewed reason or narrow it instead.",
                    )
                )
    return findings


CHECKS = [
    check_deleted_exception_types,
    check_validate_and_throw,
    check_validator_repository_dependency,
    check_domain_entity_throws,
    check_dangling_null_forgiving_after_lookup,
    check_stale_patterns_in_doc_code_blocks,
    check_dangling_adr_references,
    check_frontend_any,
    check_cross_feature_internal_imports,
    check_stale_horizontal_layout,
    check_stale_openapi_generated_path,
    check_coverage_exclude_allowlist,
]


def run_all() -> list[Finding]:
    findings: list[Finding] = []
    for check in CHECKS:
        findings.extend(check())
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--inventory",
        action="store_true",
        help="list every finding (blocking + info) for audit purposes; always exits 0",
    )
    args = parser.parse_args(argv)

    findings = run_all()
    blocking = [f for f in findings if f.severity == "blocking"]
    info = [f for f in findings if f.severity == "info"]

    if args.inventory:
        if not findings:
            print("No findings.")
            return 0
        for finding in blocking + info:
            print(f"[{finding.severity.upper():7}] {finding.file}:{finding.line} ({finding.category}) {finding.message}")
        print(f"\n{len(blocking)} blocking, {len(info)} info.")
        return 0

    if blocking:
        for finding in blocking:
            print(f"[BLOCKING] {finding.file}:{finding.line} ({finding.category}) {finding.message}")
        print(f"\narchitecture_guard failed: {len(blocking)} blocking finding(s).")
        if info:
            print(f"({len(info)} additional info-only finding(s) - see --inventory)")
        return 1

    print("architecture_guard passed: no blocking findings.")
    if info:
        print(f"({len(info)} info-only finding(s) - see --inventory)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
