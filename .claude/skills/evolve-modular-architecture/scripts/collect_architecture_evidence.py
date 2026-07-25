#!/usr/bin/env python3
"""Collect a conservative, technology-aware architecture inventory.

The report contains observations and heuristic indicators, never a target
architecture or an automatic recommendation.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


IGNORED_DIRS = {
    ".git",
    ".agents",
    ".claude",
    ".codex",
    ".hg",
    ".svn",
    ".idea",
    ".vs",
    ".vscode",
    ".venv",
    "venv",
    "__pycache__",
    "bin",
    "obj",
    "build",
    "dist",
    "coverage",
    "node_modules",
    "packages",
    "target",
    "vendor",
    "worktrees",
}

LANGUAGES = {
    ".cs": "C#",
    ".fs": "F#",
    ".vb": "Visual Basic",
    ".java": "Java",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".scala": "Scala",
    ".swift": "Swift",
    ".c": "C/C++",
    ".cc": "C/C++",
    ".cpp": "C/C++",
    ".h": "C/C++",
    ".hpp": "C/C++",
    ".sql": "SQL",
}

MANIFEST_NAMES = {
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "pipfile",
    "poetry.lock",
    "go.mod",
    "cargo.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "settings.gradle",
    "settings.gradle.kts",
    "composer.json",
    "gemfile",
    "docker-compose.yml",
    "docker-compose.yaml",
}

TEXT_EXTENSIONS = set(LANGUAGES) | {
    ".md",
    ".adoc",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".toml",
    ".props",
    ".targets",
    ".gradle",
}

INDICATORS = {
    "external_messaging": (
        "rabbitmq",
        "kafka",
        "masstransit",
        "nservicebus",
        "nats",
        "servicebus",
        "sqs",
        "pubsub",
    ),
    "in_process_messaging": (
        "mediatr",
        "inmemoryeventbus",
        "in-memory event bus",
        "in process event",
    ),
    "message_reliability": ("outbox", "inbox", "idempotent", "dead-letter", "dead letter"),
    "domain_modeling": (
        "aggregateroot",
        "aggregate root",
        "valueobject",
        "value object",
        "domainevent",
        "domain event",
        "boundedcontext",
        "bounded context",
    ),
    "feature_flags": ("featuremanagement", "feature flag", "launchdarkly", "unleash"),
    "containers_or_orchestration": (
        "dockerfile",
        "docker-compose",
        "kubernetes",
        "kustomize",
        "helm",
    ),
}

SOURCE_ROOT_NAMES = {"src", "app", "apps", "modules", "services", "components"}
TEST_PARTS = {"test", "tests", "spec", "specs", "__tests__"}
DATABASE_PARTS = {"migration", "migrations", "database", "schema", "schemas"}
MAX_TEXT_BYTES = 512_000


def relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def walk_files(root: Path, max_files: int) -> tuple[list[Path], bool]:
    files: list[Path] = []
    truncated = False
    for current, dirs, names in os.walk(root):
        dirs[:] = sorted(
            d
            for d in dirs
            if d.lower() not in IGNORED_DIRS and not (Path(current) / d).is_symlink()
        )
        for name in sorted(names):
            path = Path(current) / name
            if path.is_symlink():
                continue
            files.append(path)
            if len(files) >= max_files:
                truncated = True
                return files, truncated
    return files, truncated


def run_git(root: Path, *args: str) -> str | None:
    try:
        completed = subprocess.run(
            ["git", "-C", str(root), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=5,
        )
        value = completed.stdout.strip()
        return value or None
    except (OSError, subprocess.SubprocessError):
        return None


def git_metadata(root: Path) -> dict[str, Any]:
    return {
        "root": run_git(root, "rev-parse", "--show-toplevel"),
        "branch": run_git(root, "branch", "--show-current"),
        "commit": run_git(root, "rev-parse", "HEAD"),
        "remote": run_git(root, "remote", "get-url", "origin"),
        "latest_commit_date": run_git(root, "log", "-1", "--format=%cI"),
    }


def is_manifest(path: Path) -> bool:
    name = path.name.lower()
    return name in MANIFEST_NAMES or path.suffix.lower() in {
        ".csproj",
        ".fsproj",
        ".vbproj",
        ".sln",
        ".slnx",
    }


def read_small_text(path: Path) -> str:
    try:
        if path.stat().st_size > MAX_TEXT_BYTES:
            return ""
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def parse_dotnet_project(path: Path, root: Path) -> dict[str, Any]:
    record: dict[str, Any] = {
        "path": relative(path, root),
        "kind": path.suffix.lower().lstrip("."),
    }
    try:
        tree = ET.parse(path)
        framework = tree.findtext(".//TargetFramework") or tree.findtext(".//TargetFrameworks")
        references = [
            element.attrib.get("Include", "").replace("\\", "/")
            for element in tree.findall(".//ProjectReference")
            if element.attrib.get("Include")
        ]
        if framework:
            record["target"] = framework
        if references:
            record["project_references"] = sorted(references)
    except (OSError, ET.ParseError):
        record["parse_warning"] = "Could not parse XML"
    return record


def parse_package_json(path: Path, root: Path) -> dict[str, Any]:
    record: dict[str, Any] = {"path": relative(path, root), "kind": "package.json"}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            if isinstance(data.get("name"), str):
                record["name"] = data["name"]
            workspaces = data.get("workspaces")
            if workspaces:
                record["workspaces"] = workspaces
            local_dependencies: list[str] = []
            for section in ("dependencies", "devDependencies", "peerDependencies"):
                values = data.get(section, {})
                if not isinstance(values, dict):
                    continue
                for name, version in values.items():
                    if isinstance(version, str) and (
                        version.startswith(("workspace:", "file:", "link:")) or version == "*"
                    ):
                        local_dependencies.append(name)
            if local_dependencies:
                record["local_dependency_candidates"] = sorted(set(local_dependencies))
    except (OSError, UnicodeError, json.JSONDecodeError):
        record["parse_warning"] = "Could not parse JSON"
    return record


def parse_simple_manifest(path: Path, root: Path) -> dict[str, Any]:
    record: dict[str, Any] = {"path": relative(path, root), "kind": path.name}
    text = read_small_text(path)
    if path.name.lower() == "go.mod":
        match = re.search(r"(?m)^module\s+(\S+)", text)
        if match:
            record["name"] = match.group(1)
    elif path.name.lower() == "pyproject.toml":
        match = re.search(r'(?m)^\s*name\s*=\s*["\']([^"\']+)', text)
        if match:
            record["name"] = match.group(1)
    elif path.name.lower() == "cargo.toml":
        package_section = re.search(r"(?ms)^\[package\]\s*(.*?)(?:^\[|\Z)", text)
        if package_section:
            match = re.search(
                r'(?m)^\s*name\s*=\s*["\']([^"\']+)',
                package_section.group(1),
            )
            if match:
                record["name"] = match.group(1)
    return record


def parse_manifest(path: Path, root: Path) -> dict[str, Any]:
    if path.suffix.lower() in {".csproj", ".fsproj", ".vbproj"}:
        return parse_dotnet_project(path, root)
    if path.name.lower() == "package.json":
        return parse_package_json(path, root)
    return parse_simple_manifest(path, root)


def path_has_part(path: Path, parts: set[str]) -> bool:
    return any(part.lower() in parts for part in path.parts)


def candidate_source_roots(root: Path, files: Iterable[Path]) -> list[Path]:
    roots: set[Path] = set()
    for path in files:
        current = path.parent
        try:
            rel_parts = current.relative_to(root).parts
        except ValueError:
            continue
        for index, part in enumerate(rel_parts):
            if part.lower() in SOURCE_ROOT_NAMES and index <= 4:
                roots.add(root.joinpath(*rel_parts[: index + 1]))
    return sorted(roots, key=lambda item: relative(item, root))


def module_candidates(root: Path, files: list[Path], max_items: int) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for source_root in candidate_source_roots(root, files):
        try:
            children = sorted(
                path
                for path in source_root.iterdir()
                if path.is_dir() and path.name.lower() not in IGNORED_DIRS
            )
        except OSError:
            continue
        for child in children:
            child_files = [path for path in files if child == path.parent or child in path.parents]
            if not child_files:
                continue
            candidates.append(
                {
                    "path": relative(child, root),
                    "source_root": relative(source_root, root),
                    "files": len(child_files),
                    "manifests": sum(1 for path in child_files if is_manifest(path)),
                }
            )
    candidates.sort(key=lambda item: (-item["files"], item["path"]))
    return candidates[:max_items]


def indicator_evidence(root: Path, files: list[Path]) -> dict[str, dict[str, Any]]:
    matches: dict[str, set[str]] = {name: set() for name in INDICATORS}
    for path in files:
        rel = relative(path, root)
        haystack = rel.lower()
        if path.suffix.lower() in TEXT_EXTENSIONS or is_manifest(path):
            text = read_small_text(path)
            if text:
                haystack += "\n" + text.lower()
        for category, terms in INDICATORS.items():
            if any(term in haystack for term in terms):
                matches[category].add(rel)
    return {
        category: {"files": len(paths), "examples": sorted(paths)[:8]}
        for category, paths in matches.items()
        if paths
    }


def collect(root: Path, max_files: int, max_items: int) -> dict[str, Any]:
    files, truncated = walk_files(root, max_files)
    language_counts = Counter(
        LANGUAGES[path.suffix.lower()]
        for path in files
        if path.suffix.lower() in LANGUAGES
    )
    extension_counts = Counter(path.suffix.lower() or "<none>" for path in files)
    manifests = [parse_manifest(path, root) for path in files if is_manifest(path)]
    adr_files = [
        relative(path, root)
        for path in files
        if (
            "architecturedecisionlog"
            in relative(path, root).lower().replace("-", "").replace("_", "")
            or re.search(r"(^|/)(adr|adrs)(/|$)", relative(path, root).lower())
            or re.match(r"^\d{3,4}[-_].*\.(md|adoc)$", path.name.lower())
        )
    ]
    test_files = [
        relative(path, root)
        for path in files
        if path_has_part(path.relative_to(root), TEST_PARTS)
        or re.search(
            r"(^|[._-])(test|tests|spec|specs)([._-]|$)",
            path.name.lower(),
        )
    ]
    database_files = [
        relative(path, root)
        for path in files
        if path_has_part(path.relative_to(root), DATABASE_PARTS)
        or path.suffix.lower() == ".sql"
    ]
    ci_files = [
        relative(path, root)
        for path in files
        if relative(path, root).startswith((".github/workflows/", ".gitlab/"))
        or path.name.lower() in {"azure-pipelines.yml", ".gitlab-ci.yml", "jenkinsfile"}
    ]

    top_level_counts: Counter[str] = Counter()
    for path in files:
        parts = path.relative_to(root).parts
        top_level_counts[parts[0] if len(parts) > 1 else "<root>"] += 1

    return {
        "report_kind": "architecture evidence inventory",
        "notice": (
            "Observations and heuristic indicators only. Confirm boundaries, ownership, "
            "runtime behavior, and business drivers before making architecture decisions."
        ),
        "repository": str(root),
        "git": git_metadata(root),
        "scan": {
            "files_scanned": len(files),
            "truncated": truncated,
            "max_files": max_files,
        },
        "languages": dict(language_counts.most_common()),
        "top_extensions": dict(extension_counts.most_common(20)),
        "top_level_areas": dict(top_level_counts.most_common(max_items)),
        "manifests": manifests[:max_items],
        "manifest_count": len(manifests),
        "candidate_source_modules": module_candidates(root, files, max_items),
        "architecture_records": {
            "count": len(adr_files),
            "examples": sorted(adr_files)[:max_items],
        },
        "tests": {"count": len(test_files), "examples": sorted(test_files)[:20]},
        "database_artifacts": {
            "count": len(database_files),
            "examples": sorted(database_files)[:20],
        },
        "ci_artifacts": {"count": len(ci_files), "examples": sorted(ci_files)[:20]},
        "heuristic_indicators": indicator_evidence(root, files),
    }


def markdown_list(items: Iterable[str], empty: str = "None observed") -> list[str]:
    values = list(items)
    return [f"- {item}" for item in values] if values else [f"- {empty}"]


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Architecture evidence inventory",
        "",
        f"Repository: `{report['repository']}`",
        "",
        f"> {report['notice']}",
        "",
        "## Scan",
        "",
        f"- Files scanned: {report['scan']['files_scanned']}",
        f"- Truncated: {str(report['scan']['truncated']).lower()}",
    ]
    git = report["git"]
    lines.extend(["", "## Git", ""])
    lines.extend(markdown_list(f"{key}: `{value}`" for key, value in git.items() if value))

    lines.extend(["", "## Languages", ""])
    lines.extend(
        markdown_list(f"{name}: {count} files" for name, count in report["languages"].items())
    )

    lines.extend(["", "## Top-level areas", ""])
    lines.extend(
        markdown_list(
            f"`{name}`: {count} files"
            for name, count in report["top_level_areas"].items()
        )
    )

    lines.extend(["", "## Build/package manifests", ""])
    lines.append(f"Observed: {report['manifest_count']}")
    for manifest in report["manifests"]:
        details = [manifest["kind"]]
        if manifest.get("name"):
            details.append(f"name={manifest['name']}")
        if manifest.get("target"):
            details.append(f"target={manifest['target']}")
        if manifest.get("project_references"):
            details.append(f"project_refs={len(manifest['project_references'])}")
        lines.append(f"- `{manifest['path']}` ({', '.join(details)})")

    lines.extend(["", "## Candidate source areas", ""])
    lines.append(
        "_Directory candidates only; validate against business capabilities and ownership._"
    )
    for item in report["candidate_source_modules"]:
        lines.append(
            f"- `{item['path']}`: {item['files']} files, "
            f"{item['manifests']} manifests"
        )
    if not report["candidate_source_modules"]:
        lines.append("- None observed")

    for heading, key in (
        ("Architecture records", "architecture_records"),
        ("Tests", "tests"),
        ("Database artifacts", "database_artifacts"),
        ("CI artifacts", "ci_artifacts"),
    ):
        data = report[key]
        lines.extend(["", f"## {heading}", "", f"Observed: {data['count']}"])
        lines.extend(markdown_list(f"`{item}`" for item in data["examples"]))

    lines.extend(["", "## Heuristic indicators", ""])
    lines.append(
        "_Text/path matches are discovery leads, not proof that a pattern is correctly implemented._"
    )
    if not report["heuristic_indicators"]:
        lines.append("- None observed")
    for category, data in report["heuristic_indicators"].items():
        lines.append(f"- {category}: {data['files']} matching files")
        for example in data["examples"]:
            lines.append(f"  - `{example}`")

    lines.extend(
        [
            "",
            "## Required follow-up",
            "",
            "- Confirm business capabilities and bounded-context language with domain evidence.",
            "- Trace actual code, data, runtime, deployment, and ownership dependencies.",
            "- Measure module-specific change cadence, load, cost, failures, and release coordination.",
            "- Classify consequential claims as observed, inferred, or unknown.",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "repository",
        nargs="?",
        default=".",
        help="Repository or source directory",
    )
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", help="Write the report to this path instead of stdout")
    parser.add_argument("--max-files", type=int, default=200_000)
    parser.add_argument("--max-items", type=int, default=200)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    root = Path(args.repository).expanduser().resolve()
    if not root.is_dir():
        print(f"error: repository directory does not exist: {root}", file=sys.stderr)
        return 2
    if args.max_files < 1 or args.max_items < 1:
        print("error: --max-files and --max-items must be positive", file=sys.stderr)
        return 2

    report = collect(root, args.max_files, args.max_items)
    rendered = (
        json.dumps(report, indent=2, ensure_ascii=False) + "\n"
        if args.format == "json"
        else render_markdown(report)
    )
    if args.output:
        output = Path(args.output).expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
    else:
        try:
            sys.stdout.write(rendered)
        except UnicodeEncodeError:
            sys.stdout.buffer.write(rendered.encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
