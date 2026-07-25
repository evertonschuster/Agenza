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
import json
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Explicit, small, documented allowlist. Each entry: (relative file path,
# reason). Extend this only for a genuine, reviewed exception - never widen
# a whole directory.
ALLOWLIST: dict[str, str] = {}
IGNORE_TENANT_ATTRIBUTE_ALLOWLIST: dict[str, str] = {}

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
# Security and operability fitness functions (docs/adr/0022-0027)
# ---------------------------------------------------------------------------

def check_ai_tenant_boundaries() -> list[Finding]:
    """Every non-health FastAPI route must consume the validated
    TenantContext rather than raw claims or headers."""
    main_path = REPO_ROOT / "ai-services" / "assistant-service" / "app" / "main.py"
    if not main_path.is_file():
        return []

    text = main_path.read_text(encoding="utf-8", errors="replace")
    route_pattern = re.compile(
        r'(?m)^@app\.(?:get|post|put|patch|delete)\("([^"]+)"\)'
    )
    matches = list(route_pattern.finditer(text))
    findings: list[Finding] = []

    for index, match in enumerate(matches):
        route = match.group(1)
        if route in {"/health", "/ready"}:
            continue

        block_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        route_block = text[match.start():block_end]
        if "Depends(require_tenant_context)" in route_block:
            continue

        findings.append(
            Finding(
                "ai-route-without-tenant-context",
                "blocking",
                _rel(main_path),
                text.count("\n", 0, match.start()) + 1,
                f"Tenant-owned AI route '{route}' does not depend on require_tenant_context "
                "(docs/adr/0022).",
            )
        )

    return findings


def check_ai_dependency_parity() -> list[Finding]:
    """Local development, CI, and Aspire share Python 3.12 + uv.lock."""
    service_dir = REPO_ROOT / "ai-services" / "assistant-service"
    if not service_dir.is_dir():
        return []

    findings: list[Finding] = []
    lock_path = service_dir / "uv.lock"
    requirements_path = service_dir / "requirements.txt"
    workflow = REPO_ROOT / ".github" / "workflows" / "ai-services-ci.yml"

    if not lock_path.is_file():
        findings.append(
            Finding(
                "ai-dependency-drift",
                "blocking",
                _rel(lock_path),
                1,
                "AI service has no uv.lock shared by local development, CI, and Aspire.",
            )
        )
    if requirements_path.exists():
        findings.append(
            Finding(
                "ai-dependency-drift",
                "blocking",
                _rel(requirements_path),
                1,
                "Hand-maintained requirements.txt duplicates pyproject.toml/uv.lock.",
            )
        )

    expected_fragments = {
        workflow: [
            'python-version: "3.12"',
            "uv sync --frozen",
            "uv run pytest",
            "uv run uvicorn",
            "/health",
        ],
    }
    for path, fragments in expected_fragments.items():
        text = path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""
        for fragment in fragments:
            if fragment not in text:
                findings.append(
                    Finding(
                        "ai-runtime-parity",
                        "blocking",
                        _rel(path),
                        1,
                        f"Missing '{fragment}' required for AI runtime/CI parity.",
                    )
                )

    return findings


def check_aspire_local_orchestration() -> list[Finding]:
    """Aspire is the only application orchestrator until deployment is designed."""
    findings: list[Finding] = []
    forbidden_paths = [
        REPO_ROOT / "infra/docker-compose.yml",
        REPO_ROOT / "infra/docker-compose.yaml",
        REPO_ROOT / "compose.yml",
        REPO_ROOT / "compose.yaml",
    ]
    for application_root in (
        REPO_ROOT / "apps",
        REPO_ROOT / "ai-services",
        REPO_ROOT / "backend/services",
    ):
        if application_root.is_dir():
            forbidden_paths.extend(application_root.rglob("Dockerfile"))

    for path in forbidden_paths:
        if not path.exists():
            continue
        findings.append(
            Finding(
                "parallel-local-orchestrator",
                "blocking",
                _rel(path),
                1,
                "Application Docker/Compose orchestration conflicts with the "
                "Aspire-only local runtime decision (docs/adr/0029).",
            )
        )

    apphost = REPO_ROOT / "backend/AppHost/AppHost.cs"
    apphost_text = (
        apphost.read_text(encoding="utf-8", errors="replace")
        if apphost.is_file()
        else ""
    )
    required_apphost_fragments = [
        'AddPostgres("postgres"',
        ".WithHostPort(5432)",
        '.WithEnvironment("POSTGRES_DB", "appdb")',
        '.WithEnvironment("APP_DB_PASSWORD"',
        "Password={developmentPassword}",
        '.WithEnvironment("IdentityClients__AssistantServiceWorker__Secret", developmentPassword)',
        '.WithEnvironment("IdentityClients__TenantProvisioning__Secret", developmentPassword)',
        '.WithEnvironment("IDENTITY_CLIENT_SECRET", developmentPassword)',
        '.WithDataVolume("agenza-postgres-data")',
        ".WithInitFiles(",
        "AddProject<Projects.IdentityService_Api>",
        "AddProject<Projects.ServicesService_Api>",
        "AddUvicornApp(",
        '.WithUv(args: ["sync", "--frozen", "--extra", "dev"])',
        "AddViteApp(",
        '"VITE_OIDC_AUTHORITY"',
        '"VITE_OIDC_CLIENT_ID"',
        '"VITE_OIDC_REDIRECT_URI"',
        '"VITE_OIDC_POST_LOGOUT_REDIRECT_URI"',
        '"VITE_OIDC_SCOPE"',
        '"VITE_API_BASE_URL"',
    ]
    for fragment in required_apphost_fragments:
        if fragment not in apphost_text:
            findings.append(
                Finding(
                    "incomplete-aspire-orchestration",
                    "blocking",
                    _rel(apphost),
                    1,
                    f"Missing '{fragment}' required by the Aspire-only local runtime.",
                )
            )

    if not re.search(
        r'AddParameter\s*\(\s*"development-password"',
        apphost_text,
    ):
        findings.append(
            Finding(
                "incomplete-aspire-orchestration",
                "blocking",
                _rel(apphost),
                1,
                "Missing the shared 'development-password' Aspire parameter.",
            )
        )

    obsolete_dev_parameters = [
        "postgres-password",
        "identity-db-password",
        "services-db-password",
        "assistant-worker-secret",
        "tenant-provisioning-secret",
    ]
    for parameter in obsolete_dev_parameters:
        if not re.search(
            rf'AddParameter\s*\(\s*"{re.escape(parameter)}"',
            apphost_text,
        ):
            continue
        findings.append(
            Finding(
                "duplicated-aspire-development-secret",
                "blocking",
                _rel(apphost),
                1,
                f"'{parameter}' duplicates the shared local-development password.",
            )
        )

    init_script = REPO_ROOT / "infra/postgres/init/001-service-roles.sh"
    init_text = (
        init_script.read_text(encoding="utf-8", errors="replace")
        if init_script.is_file()
        else ""
    )
    if "APP_DB_PASSWORD" not in init_text:
        findings.append(
            Finding(
                "incomplete-aspire-orchestration",
                "blocking",
                _rel(init_script),
                1,
                "The PostgreSQL role bootstrap does not consume the shared password.",
            )
        )

    workflow = REPO_ROOT / ".github" / "workflows" / "frontend-ci.yml"
    workflow_text = (
        workflow.read_text(encoding="utf-8", errors="replace")
        if workflow.is_file()
        else ""
    )
    if "dotnet run --project backend/AppHost" not in workflow_text:
        findings.append(
            Finding(
                "aspire-runtime-not-exercised",
                "blocking",
                _rel(workflow),
                1,
                "The API-contract job does not start the application through Aspire.",
            )
        )
    if "docker compose" in workflow_text:
        findings.append(
            Finding(
                "parallel-local-orchestrator",
                "blocking",
                _rel(workflow),
                1,
                "The API-contract job still starts the application through Docker Compose.",
            )
        )

    return findings


def check_trunk_precommit_guard() -> list[Finding]:
    """The documented trunk policy must remain mechanically enforced."""
    hook = REPO_ROOT / ".husky/pre-commit"
    text = hook.read_text(encoding="utf-8", errors="replace") if hook.is_file() else ""
    required = [
        "git symbolic-ref --short HEAD",
        'if [ "$branch" = "main" ]',
        "exit 1",
    ]
    missing = [fragment for fragment in required if fragment not in text]
    if not missing:
        return []

    return [
        Finding(
            "direct-main-commit-not-blocked",
            "blocking",
            _rel(hook),
            1,
            "The pre-commit hook no longer enforces docs/adr/0021; missing "
            + ", ".join(repr(fragment) for fragment in missing)
            + ".",
        )
    ]


def check_dotnet_project_reference_boundaries() -> list[Finding]:
    """Enforce the accepted service-layer graph using resolved project paths."""
    services_root = REPO_ROOT / "backend" / "services"
    if not services_root.is_dir():
        return []

    findings: list[Finding] = []
    shared_root = REPO_ROOT / "backend" / "shared"
    service_defaults = REPO_ROOT / "backend" / "ServiceDefaults" / "ServiceDefaults.csproj"

    for project in _iter_files(services_root, (".csproj",)):
        project_name = project.parent.name
        if project_name.endswith(("Tests", "RuntimeTests", "PersistenceTests")):
            continue

        layer = next(
            (
                suffix
                for suffix in (".Domain", ".Application", ".Infrastructure", ".Api")
                if project_name.endswith(suffix)
            ),
            None,
        )
        if layer is None:
            continue

        try:
            root = ET.parse(project).getroot()
        except ET.ParseError:
            continue

        source_service = project.relative_to(services_root).parts[0]
        own_service_root = services_root / source_service
        allowed_by_layer = {
            ".Application": {
                own_service_root / project_name.replace(".Application", ".Domain")
                / project_name.replace(".Application", ".Domain.csproj"),
                shared_root / "Admin.SharedKernel" / "Admin.SharedKernel.csproj",
            },
            ".Infrastructure": {
                own_service_root / project_name.replace(".Infrastructure", ".Application")
                / project_name.replace(".Infrastructure", ".Application.csproj"),
                shared_root / "Admin.Identity.Client" / "Admin.Identity.Client.csproj",
                shared_root
                / "Admin.SharedKernel.EntityFrameworkCore"
                / "Admin.SharedKernel.EntityFrameworkCore.csproj",
            },
            ".Api": {
                own_service_root / project_name.replace(".Api", ".Application")
                / project_name.replace(".Api", ".Application.csproj"),
                own_service_root / project_name.replace(".Api", ".Infrastructure")
                / project_name.replace(".Api", ".Infrastructure.csproj"),
                shared_root / "Admin.Identity.Client" / "Admin.Identity.Client.csproj",
                shared_root
                / "Admin.SharedKernel.AspNetCore"
                / "Admin.SharedKernel.AspNetCore.csproj",
                service_defaults,
            },
        }
        allowed = {path.resolve() for path in allowed_by_layer.get(layer, set())}

        for reference in root.findall(".//ProjectReference"):
            include = reference.get("Include")
            if not include:
                continue
            target = (project.parent / include.replace("\\", "/")).resolve()
            if layer == ".Domain" or target not in allowed:
                findings.append(
                    Finding(
                        "dotnet-project-reference-boundary",
                        "blocking",
                        _rel(project),
                        1,
                        f"{project_name} cannot reference {_rel(target)}; "
                        f"the accepted layer graph is documented in backend/AGENTS.md.",
                    )
                )

    return findings


def check_dedicated_runtime_test_tier_absent() -> list[Finding]:
    """ADR 0026 removed the Testcontainers/WebApplicationFactory tier.
    Reintroducing it requires an explicit architecture decision."""
    findings: list[Finding] = []
    backend_root = REPO_ROOT / "backend"

    for project in _iter_files(backend_root, (".csproj",)):
        if "RuntimeTests" not in project.stem:
            continue
        findings.append(
            Finding(
                "dedicated-runtime-test-tier",
                "blocking",
                _rel(project),
                1,
                "A RuntimeTests project reintroduces the tier removed by docs/adr/0026; "
                "record concrete failure evidence and a new ADR before restoring it.",
            )
        )

    solution = backend_root / "AdminBackend.slnx"
    if solution.is_file():
        for line_number, line in enumerate(
            solution.read_text(encoding="utf-8", errors="replace").splitlines(),
            start=1,
        ):
            if "RuntimeTests" in line:
                findings.append(
                    Finding(
                        "dedicated-runtime-test-tier",
                        "blocking",
                        _rel(solution),
                        line_number,
                        "AdminBackend.slnx references a RuntimeTests project removed by "
                        "docs/adr/0026.",
                    )
                )

    packages = backend_root / "Directory.Packages.props"
    if packages.is_file():
        forbidden_packages = (
            "Testcontainers.PostgreSql",
            "Microsoft.AspNetCore.Mvc.Testing",
        )
        for line_number, line in enumerate(
            packages.read_text(encoding="utf-8", errors="replace").splitlines(),
            start=1,
        ):
            for package in forbidden_packages:
                if f'Include="{package}"' not in line:
                    continue
                findings.append(
                    Finding(
                        "dedicated-runtime-test-tier",
                        "blocking",
                        _rel(packages),
                        line_number,
                        f"{package} belongs to the runtime-test tier removed by "
                        "docs/adr/0026.",
                    )
                )

    return findings


def check_ignore_tenant_attribute_allowlist() -> list[Finding]:
    """A tenant opt-out is security-sensitive and requires an explicit file allowlist."""
    findings: list[Finding] = []
    for path in _iter_files(REPO_ROOT / "backend" / "services", (".cs",)):
        relative = _rel(path)
        if relative in IGNORE_TENANT_ATTRIBUTE_ALLOWLIST:
            continue
        for line_number, line in enumerate(
            path.read_text(encoding="utf-8-sig", errors="replace").splitlines(),
            start=1,
        ):
            if re.match(r"^\s*\[IgnoreTenant(?:Attribute)?(?:\(|\])", line):
                findings.append(
                    Finding(
                        "unreviewed-ignore-tenant",
                        "blocking",
                        relative,
                        line_number,
                        "[IgnoreTenant] bypasses the default tenant boundary and is not "
                        "in IGNORE_TENANT_ATTRIBUTE_ALLOWLIST.",
                    )
                )
    return findings


def check_database_bootstrap_defaults() -> list[Finding]:
    """Base configuration must never silently migrate/seed on process start."""
    paths = [
        REPO_ROOT
        / "backend/services/identity-service/IdentityService.Api/appsettings.json",
        REPO_ROOT
        / "backend/services/services-service/ServicesService.Api/appsettings.json",
    ]
    findings: list[Finding] = []

    for path in paths:
        if not path.parent.is_dir():
            continue
        try:
            settings = json.loads(path.read_text(encoding="utf-8"))
            enabled = settings["DatabaseBootstrap"]["RunOnStartup"]
        except (FileNotFoundError, KeyError, json.JSONDecodeError, TypeError):
            enabled = None

        if enabled is not False:
            findings.append(
                Finding(
                    "unsafe-database-bootstrap-default",
                    "blocking",
                    _rel(path),
                    1,
                    "Base configuration must set DatabaseBootstrap:RunOnStartup to false "
                    "(docs/adr/0025).",
                )
            )

    return findings


def check_bootstrap_advisory_lock_absent() -> list[Finding]:
    """ADR 0027 keeps the demo bootstrap single-instance and rejects a
    speculative distributed lock until a deployment driver exists."""
    cs_files = _iter_files(REPO_ROOT / "backend", (".cs",))
    return _findings_for_pattern(
        cs_files,
        re.compile(r"\bPostgresAdvisoryLock\b|\bpg_advisory_(?:lock|unlock)\b"),
        "bootstrap-advisory-lock",
        "blocking",
        "PostgreSQL advisory bootstrap locking was removed by docs/adr/0027; "
        "use a one-shot deployment bootstrap when multiple replicas become real.",
    )


def check_database_boundary_configuration() -> list[Finding]:
    """The current tenant relationships and service database identities are
    small enough to enforce with exact, low-noise structural checks."""
    findings: list[Finding] = []
    config_path = (
        REPO_ROOT
        / "backend/services/services-service/ServicesService.Infrastructure"
        / "Persistence/Configurations/ServiceConfiguration.cs"
    )
    if config_path.is_file():
        text = config_path.read_text(encoding="utf-8", errors="replace")
        required = [
            'HasForeignKey(s => new { s.TenantId, s.CategoryId })',
            '.HasForeignKey("TenantId", "ServiceId")',
            '.HasForeignKey("TenantId", "TagsId")',
            'join.HasKey("TenantId", "ServiceId", "TagsId")',
        ]
        for fragment in required:
            if fragment not in text:
                findings.append(
                    Finding(
                        "tenant-relationship-not-database-enforced",
                        "blocking",
                        _rel(config_path),
                        1,
                        f"Missing composite tenant relationship fragment '{fragment}' "
                        "(docs/adr/0024).",
                    )
                )

    apphost_path = REPO_ROOT / "backend/AppHost/AppHost.cs"
    if apphost_path.is_file():
        for line_number, line in enumerate(
            apphost_path.read_text(encoding="utf-8", errors="replace").splitlines(),
            start=1,
        ):
            if "Username=postgres" in line:
                findings.append(
                    Finding(
                        "service-uses-database-superuser",
                        "blocking",
                        _rel(apphost_path),
                        line_number,
                        "Application service connects as the PostgreSQL superuser "
                        "(docs/adr/0024).",
                    )
                )

    return findings


def check_destructive_migration_safety() -> list[Finding]:
    """A new destructive Up migration needs an explicit reviewed safety
    marker."""
    migration_files = [
        path
        for path in _iter_files(REPO_ROOT / "backend" / "services", (".cs",))
        if "/Migrations/" in path.as_posix() and not path.name.endswith(".Designer.cs")
    ]
    destructive_pattern = re.compile(
        r"migrationBuilder\.(DropTable|DropColumn)\s*\(|"
        r"\b(?:DELETE\s+FROM|TRUNCATE\s+TABLE)\b",
        re.IGNORECASE,
    )
    findings: list[Finding] = []

    for path in migration_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        up_match = re.search(
            r"protected\s+override\s+void\s+Up\b(.*?)"
            r"protected\s+override\s+void\s+Down\b",
            text,
            re.DOTALL,
        )
        if not up_match:
            continue

        destructive = destructive_pattern.search(up_match.group(1))
        if not destructive:
            continue
        if "migration-safety:" in up_match.group(1):
            continue

        absolute_offset = up_match.start(1) + destructive.start()
        findings.append(
            Finding(
                "destructive-migration-without-safety-plan",
                "blocking",
                _rel(path),
                text.count("\n", 0, absolute_offset) + 1,
                "Destructive Up migration has no 'migration-safety:' marker documenting "
                "preflight/backfill/rollback review (docs/adr/0025).",
            )
        )

    return findings


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
    check_ai_tenant_boundaries,
    check_ai_dependency_parity,
    check_aspire_local_orchestration,
    check_trunk_precommit_guard,
    check_dotnet_project_reference_boundaries,
    check_dedicated_runtime_test_tier_absent,
    check_ignore_tenant_attribute_allowlist,
    check_database_bootstrap_defaults,
    check_bootstrap_advisory_lock_absent,
    check_database_boundary_configuration,
    check_destructive_migration_safety,
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
