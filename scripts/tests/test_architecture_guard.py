import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import architecture_guard as ag  # noqa: E402


class ArchitectureGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        self._patcher = mock.patch.object(ag, "REPO_ROOT", self.root)
        self._patcher.start()
        self.addCleanup(self._patcher.stop)

    def _write(self, rel: str, content: str) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def _categories(self, findings) -> set[str]:
        return {f.category for f in findings}

    # -- deleted exception types -------------------------------------------

    def test_duplicate_entity_exception_is_blocking(self) -> None:
        self._write(
            "backend/services/x/X.Infrastructure/UnitOfWork.cs",
            "throw new DuplicateEntityException();\n",
        )

        findings = ag.check_deleted_exception_types()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    def test_business_exception_handler_is_blocking(self) -> None:
        self._write(
            "backend/services/x/X.Api/ExceptionHandling/Foo.cs",
            "public class BusinessExceptionHandler {}\n",
        )

        findings = ag.check_deleted_exception_types()

        self.assertEqual(len(findings), 1)

    def test_clean_backend_file_has_no_deleted_exception_findings(self) -> None:
        self._write(
            "backend/services/x/X.Application/Foo/FooHandler.cs",
            "public class FooHandler { }\n",
        )

        findings = ag.check_deleted_exception_types()

        self.assertEqual(findings, [])

    # -- ValidateAndThrow ----------------------------------------------------

    def test_validate_and_throw_is_blocking(self) -> None:
        self._write(
            "backend/services/x/X.Application/Foo/FooHandler.cs",
            "validator.ValidateAndThrow(command);\n",
        )

        findings = ag.check_validate_and_throw()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    # -- validator repository dependency -------------------------------------

    def test_validator_with_repository_and_must_async_is_blocking(self) -> None:
        self._write(
            "backend/services/x/X.Application/Foo/FooValidator.cs",
            "\n".join(
                [
                    "namespace X.Application.Foo;",
                    "public sealed class FooValidator : AbstractValidator<FooCommand>",
                    "{",
                    "    public FooValidator(IWidgetRepository repository)",
                    "    {",
                    "        RuleFor(x => x.Name).MustAsync(async (n, ct) => !await repository.NameExistsAsync(n, null, ct));",
                    "    }",
                    "}",
                    "",
                ]
            ),
        )

        findings = ag.check_validator_repository_dependency()

        categories = self._categories(findings)
        self.assertIn("validator-repository-dependency", categories)
        self.assertIn("validator-async-repository-rule", categories)
        self.assertTrue(all(f.severity == "blocking" for f in findings))

    def test_validator_with_no_dependencies_is_clean(self) -> None:
        self._write(
            "backend/services/x/X.Application/Foo/FooValidator.cs",
            "\n".join(
                [
                    "public sealed class FooValidator : AbstractValidator<FooCommand>",
                    "{",
                    "    public FooValidator()",
                    "    {",
                    "        RuleFor(x => x.Name).NotEmpty().MaximumLength(80);",
                    "    }",
                    "}",
                    "",
                ]
            ),
        )

        findings = ag.check_validator_repository_dependency()

        self.assertEqual(findings, [])

    # -- domain entity throws -------------------------------------------------

    def test_domain_entity_throw_is_blocking(self) -> None:
        self._write(
            "backend/services/x/X.Domain/Entities/Widget.cs",
            "public static Widget Create(string name) { throw new InvalidWidgetException(); }\n",
        )

        findings = ag.check_domain_entity_throws()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    def test_domain_entity_returning_domain_result_is_clean(self) -> None:
        self._write(
            "backend/services/x/X.Domain/Entities/Widget.cs",
            "public static DomainResult<Widget> Create(string name) => DomainResult.Success(new Widget(name));\n",
        )

        findings = ag.check_domain_entity_throws()

        self.assertEqual(findings, [])

    def test_throw_outside_entities_folder_is_not_flagged(self) -> None:
        self._write(
            "backend/services/x/X.Domain/Common/TenantOwnedEntity.cs",
            "public void AssignTenant(Guid tenantId) { if (tenantId == Guid.Empty) throw new InvalidOperationException(); }\n",
        )

        findings = ag.check_domain_entity_throws()

        self.assertEqual(findings, [])

    # -- null-forgiving lookup (info only) -------------------------------------

    def test_null_forgiving_after_lookup_is_info_only(self) -> None:
        self._write(
            "backend/services/x/X.Application/Foo/FooHandler.cs",
            "var widget = (await _repository.GetByIdAsync(command.WidgetId, cancellationToken))!;\n",
        )

        findings = ag.check_dangling_null_forgiving_after_lookup()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "info")

    # -- stale patterns in doc code blocks -------------------------------------

    def test_banned_identifier_in_code_fence_is_blocking(self) -> None:
        self._write(
            "some-skill/SKILL.md",
            "\n".join(
                [
                    "# Some Skill",
                    "",
                    "```csharp",
                    "throw new DuplicateEntityException();",
                    "```",
                    "",
                ]
            ),
        )

        findings = ag.check_stale_patterns_in_doc_code_blocks()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")
        # Line 4 is the actual offending code line; line 3 is the opening
        # ``` fence itself - the finding must point at the former.
        self.assertEqual(findings[0].line, 4)

    def test_banned_identifier_on_a_later_code_line_reports_the_correct_line(self) -> None:
        self._write(
            "some-skill/SKILL.md",
            "\n".join(
                [
                    "```csharp",
                    "var x = 1;",
                    "throw new BusinessExceptionHandler();",
                    "```",
                    "",
                ]
            ),
        )

        findings = ag.check_stale_patterns_in_doc_code_blocks()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].line, 3)

    def test_validator_with_must_async_in_code_fence_is_blocking(self) -> None:
        self._write(
            "some-skill/SKILL.md",
            "\n".join(
                [
                    "```csharp",
                    "public class FooValidator {",
                    "    public FooValidator(IFooRepository repository) {",
                    "        RuleFor(x => x.Name).MustAsync(async (n, ct) => true);",
                    "    }",
                    "}",
                    "```",
                    "",
                ]
            ),
        )

        findings = ag.check_stale_patterns_in_doc_code_blocks()

        self.assertEqual(len(findings), 1)

    def test_obsolete_marked_file_is_skipped(self) -> None:
        self._write(
            "some-skill/SKILL.md",
            "\n".join(
                [
                    "---",
                    "name: some-skill",
                    "description: OBSOLETE - superseded, see canonical skill",
                    "---",
                    "```csharp",
                    "throw new DuplicateEntityException();",
                    "```",
                    "",
                ]
            ),
        )

        findings = ag.check_stale_patterns_in_doc_code_blocks()

        self.assertEqual(findings, [])

    def test_adr_directory_is_skipped(self) -> None:
        self._write(
            "docs/adr/0099-historical.md",
            "\n".join(["```csharp", "throw new DuplicateEntityException();", "```", ""]),
        )

        findings = ag.check_stale_patterns_in_doc_code_blocks()

        self.assertEqual(findings, [])

    def test_prose_mentioning_banned_name_outside_code_fence_is_not_flagged(self) -> None:
        self._write(
            "some-skill/SKILL.md",
            "Never write `DuplicateEntityException` - it was deleted by docs/adr/0014.\n",
        )

        findings = ag.check_stale_patterns_in_doc_code_blocks()

        self.assertEqual(findings, [])

    # -- dangling ADR references (info only) -----------------------------------

    def test_dangling_adr_reference_in_source_is_info_only(self) -> None:
        self._write("docs/adr/0001-real.md", "# ADR\n")
        self._write(
            "backend/services/x/X.Application/Foo/FooHandler.cs",
            "// see docs/adr/0099 for rationale\n",
        )

        findings = ag.check_dangling_adr_references()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "info")

    # -- frontend any ----------------------------------------------------------

    def test_frontend_any_is_blocking(self) -> None:
        self._write(
            "apps/admin-frontend/src/domain/entities/Widget.ts",
            "function parse(value: any): void {}\n",
        )

        findings = ag.check_frontend_any()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    def test_frontend_unknown_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/src/domain/entities/Widget.ts",
            "function parse(value: unknown): void {}\n",
        )

        findings = ag.check_frontend_any()

        self.assertEqual(findings, [])

    # -- cross-feature internal imports (ADR 009) ---------------------------

    def test_cross_feature_internal_import_is_blocking(self) -> None:
        self._write(
            "apps/admin-frontend/src/features/catalog/application/use-cases/tags/ListTags.ts",
            "import type { TenantContext } from '@/features/auth/application/context/TenantContext'\n",
        )
        self._write(
            "apps/admin-frontend/src/features/auth/application/context/TenantContext.ts",
            "export interface TenantContext {}\n",
        )

        findings = ag.check_cross_feature_internal_imports()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    def test_import_through_feature_public_api_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/src/features/catalog/application/use-cases/tags/ListTags.ts",
            "import type { TenantContext } from '@/features/auth'\n",
        )
        self._write(
            "apps/admin-frontend/src/features/auth/application/context/TenantContext.ts",
            "export interface TenantContext {}\n",
        )

        findings = ag.check_cross_feature_internal_imports()

        self.assertEqual(findings, [])

    def test_feature_importing_its_own_internals_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/src/features/auth/presentation/useAuth.ts",
            "import type { TenantContext } from '@/features/auth/application/context/TenantContext'\n",
        )

        findings = ag.check_cross_feature_internal_imports()

        self.assertEqual(findings, [])

    def test_test_fixtures_reaching_into_feature_internals_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/src/test/mocks/handlers/tagHandlers.ts",
            "import type { TagDto } from '@/features/catalog/infrastructure/mappers/tagMapper'\n",
        )

        findings = ag.check_cross_feature_internal_imports()

        self.assertEqual(findings, [])

    # -- stale horizontal layout (ADR 009) -----------------------------------

    def test_stale_domain_dir_is_blocking(self) -> None:
        self._write("apps/admin-frontend/src/domain/entities/Widget.ts", "export class Widget {}\n")

        findings = ag.check_stale_horizontal_layout()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    def test_feature_based_layout_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/src/features/catalog/domain/entities/Tag.ts",
            "export class Tag {}\n",
        )

        findings = ag.check_stale_horizontal_layout()

        self.assertEqual(findings, [])

    # -- stale OpenAPI generated-types path (ADR 009) --------------------------

    def test_stale_openapi_path_in_package_json_is_blocking(self) -> None:
        self._write(
            "apps/admin-frontend/package.json",
            '{"scripts": {"generate:api-types": "openapi-typescript x -o '
            'src/infrastructure/generated/services-api.d.ts"}}\n',
        )

        findings = ag.check_stale_openapi_generated_path()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    def test_stale_openapi_path_in_prettierignore_is_blocking(self) -> None:
        self._write("apps/admin-frontend/.prettierignore", "src/infrastructure/generated\n")

        findings = ag.check_stale_openapi_generated_path()

        self.assertEqual(len(findings), 1)

    def test_feature_based_openapi_path_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/package.json",
            '{"scripts": {"generate:api-types": "openapi-typescript x -o '
            'src/features/catalog/infrastructure/generated/services-api.d.ts"}}\n',
        )
        self._write(
            "apps/admin-frontend/.prettierignore",
            "src/features/catalog/infrastructure/generated\n",
        )

        findings = ag.check_stale_openapi_generated_path()

        self.assertEqual(findings, [])

    def test_stale_openapi_path_in_code_fence_is_blocking(self) -> None:
        self._write(
            "some-skill/SKILL.md",
            "\n".join(
                [
                    "```typescript",
                    "import type { components } from 'src/infrastructure/generated/services-api'",
                    "```",
                    "",
                ]
            ),
        )

        findings = ag.check_stale_openapi_generated_path()

        self.assertEqual(len(findings), 1)

    def test_stale_openapi_path_in_prose_outside_code_fence_is_not_flagged(self) -> None:
        self._write(
            "docs/some-narrative.md",
            "The old path was `src/infrastructure/generated/services-api.d.ts`, moved by ADR 009.\n",
        )

        findings = ag.check_stale_openapi_generated_path()

        self.assertEqual(findings, [])

    def test_stale_openapi_path_in_adr_directory_is_skipped(self) -> None:
        self._write(
            "docs/adr/0009-feature-based-modularization.md",
            "\n".join(
                [
                    "```typescript",
                    "// old: src/infrastructure/generated/services-api.d.ts",
                    "```",
                    "",
                ]
            ),
        )

        findings = ag.check_stale_openapi_generated_path()

        self.assertEqual(findings, [])

    # -- coverage exclude allowlist -------------------------------------------

    def test_coverage_exclude_outside_allowlist_is_blocking(self) -> None:
        self._write(
            "apps/admin-frontend/vitest.config.ts",
            "\n".join(
                [
                    "export default {",
                    "  test: { coverage: { exclude: [",
                    "    'node_modules/',",
                    "    'src/application/**',",
                    "  ] } }",
                    "}",
                    "",
                ]
            ),
        )

        findings = ag.check_coverage_exclude_allowlist()

        self.assertEqual(len(findings), 1)
        self.assertIn("src/application/**", findings[0].message)

    def test_coverage_exclude_within_allowlist_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/vitest.config.ts",
            "\n".join(
                [
                    "export default {",
                    "  test: { coverage: { exclude: [",
                    "    'node_modules/',",
                    "    'src/test/',",
                    "    '**/main.tsx',",
                    "    '**/App.tsx',",
                    "    'src/app/routes/router.tsx',",
                    "    'src/app/pages/StubPage/**',",
                    "  ] } }",
                    "}",
                    "",
                ]
            ),
        )

        findings = ag.check_coverage_exclude_allowlist()

        self.assertEqual(findings, [])

    def test_test_level_exclude_before_coverage_exclude_is_not_flagged(self) -> None:
        # vitest.config.ts has two different `exclude:` keys: test.exclude
        # (which test *files* to collect - unrelated to the coverage gate)
        # and test.coverage.exclude (what this check actually polices). A
        # naive first-match search over the whole file would grab the
        # former - e.g. 'e2e/**', keeping Playwright specs out of Vitest's
        # own run - and wrongly flag it as an undocumented coverage-gate
        # widening.
        self._write(
            "apps/admin-frontend/vitest.config.ts",
            "\n".join(
                [
                    "export default {",
                    "  test: {",
                    "    exclude: ['e2e/**'],",
                    "    coverage: { exclude: [",
                    "      'node_modules/',",
                    "      'src/test/',",
                    "    ] },",
                    "  },",
                    "}",
                    "",
                ]
            ),
        )

        findings = ag.check_coverage_exclude_allowlist()

        self.assertEqual(findings, [])

    def test_coverage_exclude_drift_still_caught_alongside_test_exclude(self) -> None:
        self._write(
            "apps/admin-frontend/vitest.config.ts",
            "\n".join(
                [
                    "export default {",
                    "  test: {",
                    "    exclude: ['e2e/**'],",
                    "    coverage: { exclude: [",
                    "      'node_modules/',",
                    "      'src/application/**',",
                    "    ] },",
                    "  },",
                    "}",
                    "",
                ]
            ),
        )

        findings = ag.check_coverage_exclude_allowlist()

        self.assertEqual(len(findings), 1)
        self.assertIn("src/application/**", findings[0].message)

    # -- evolutionary architecture fitness functions -------------------------

    def test_tenant_owned_ai_route_requires_tenant_context(self) -> None:
        self._write(
            "ai-services/assistant-service/app/main.py",
            "\n".join(
                [
                    '@app.get("/health")',
                    "def health(): return {}",
                    '@app.post("/draft")',
                    "def draft(claims=Depends(require_valid_token)): return {}",
                    "",
                ]
            ),
        )

        findings = ag.check_ai_tenant_boundaries()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "ai-route-without-tenant-context")

    def test_ai_health_and_tenant_context_route_are_clean(self) -> None:
        self._write(
            "ai-services/assistant-service/app/main.py",
            "\n".join(
                [
                    '@app.get("/health")',
                    "def health(): return {}",
                    '@app.post("/draft")',
                    "def draft(tenant=Depends(require_tenant_context)): return {}",
                    "",
                ]
            ),
        )

        self.assertEqual(ag.check_ai_tenant_boundaries(), [])

    def test_backend_container_context_requires_dockerignore(self) -> None:
        for path in [
            "backend/services/identity-service/IdentityService.Api/Dockerfile",
            "backend/services/services-service/ServicesService.Api/Dockerfile",
        ]:
            self._write(
                path,
                'COPY ["NuGet.Config", "."]\nRUN dotnet build Api.csproj --no-restore\n',
            )
        self._write(
            ".github/workflows/backend-ci.yml",
            "run: docker compose build identity-service services-service\n",
        )

        findings = ag.check_backend_container_parity()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "backend-container-context-drift")

    def test_backend_ci_must_build_both_runtime_images(self) -> None:
        self._write("backend/.dockerignore", "**/bin\n")
        for path in [
            "backend/services/identity-service/IdentityService.Api/Dockerfile",
            "backend/services/services-service/ServicesService.Api/Dockerfile",
        ]:
            self._write(
                path,
                'COPY ["NuGet.Config", "."]\nRUN dotnet build Api.csproj --no-restore\n',
            )
        self._write(".github/workflows/backend-ci.yml", "run: dotnet build\n")

        findings = ag.check_backend_container_parity()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "backend-images-not-built-in-ci")

    def test_domain_project_reference_is_blocking(self) -> None:
        self._write(
            "backend/services/catalog/Catalog.Domain/Catalog.Domain.csproj",
            '<Project><ItemGroup><ProjectReference Include="../Catalog.Application/Catalog.Application.csproj" /></ItemGroup></Project>',
        )

        findings = ag.check_dotnet_project_reference_boundaries()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "dotnet-project-reference-boundary")

    def test_application_cannot_reference_infrastructure(self) -> None:
        self._write(
            "backend/services/catalog/Catalog.Application/Catalog.Application.csproj",
            '<Project><ItemGroup><ProjectReference Include="../Catalog.Infrastructure/Catalog.Infrastructure.csproj" /></ItemGroup></Project>',
        )

        findings = ag.check_dotnet_project_reference_boundaries()

        self.assertEqual(len(findings), 1)

    def test_application_to_own_domain_and_shared_kernel_is_clean(self) -> None:
        self._write(
            "backend/services/catalog/Catalog.Application/Catalog.Application.csproj",
            "\n".join(
                [
                    "<Project><ItemGroup>",
                    '<ProjectReference Include="../Catalog.Domain/Catalog.Domain.csproj" />',
                    '<ProjectReference Include="../../../shared/Admin.SharedKernel/Admin.SharedKernel.csproj" />',
                    "</ItemGroup></Project>",
                ]
            ),
        )

        self.assertEqual(ag.check_dotnet_project_reference_boundaries(), [])

    def test_runtime_test_project_is_blocking(self) -> None:
        self._write(
            "backend/services/catalog/Catalog.RuntimeTests/Catalog.RuntimeTests.csproj",
            "<Project />",
        )

        findings = ag.check_dedicated_runtime_test_tier_absent()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "dedicated-runtime-test-tier")

    def test_runtime_test_packages_are_blocking(self) -> None:
        self._write(
            "backend/Directory.Packages.props",
            '<Project><PackageVersion Include="Testcontainers.PostgreSql" '
            'Version="4.13.0" /></Project>',
        )

        findings = ag.check_dedicated_runtime_test_tier_absent()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "dedicated-runtime-test-tier")

    def test_backend_without_runtime_test_tier_is_clean(self) -> None:
        self._write(
            "backend/Directory.Packages.props",
            '<Project><PackageVersion Include="xunit" Version="2.9.3" /></Project>',
        )
        self._write(
            "backend/AdminBackend.slnx",
            '<Solution><Project Path="services/catalog/Catalog.Tests.csproj" /></Solution>',
        )

        self.assertEqual(ag.check_dedicated_runtime_test_tier_absent(), [])

    def test_ignore_tenant_requires_an_explicit_allowlist_entry(self) -> None:
        self._write(
            "backend/services/catalog/Catalog.Api/Controllers/PublicController.cs",
            "[IgnoreTenant]\npublic sealed class PublicController { }\n",
        )

        findings = ag.check_ignore_tenant_attribute_allowlist()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "unreviewed-ignore-tenant")

    def test_base_database_bootstrap_true_is_blocking(self) -> None:
        self._write(
            "backend/services/identity-service/IdentityService.Api/appsettings.json",
            '{"DatabaseBootstrap":{"RunOnStartup":true}}',
        )

        findings = ag.check_database_bootstrap_defaults()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "unsafe-database-bootstrap-default")

    def test_bootstrap_advisory_lock_is_blocking(self) -> None:
        self._write(
            "backend/shared/Database/PostgresAdvisoryLock.cs",
            'await command.ExecuteAsync("SELECT pg_advisory_lock(42);");\n',
        )

        findings = ag.check_bootstrap_advisory_lock_absent()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "bootstrap-advisory-lock")

    def test_bootstrap_without_advisory_lock_is_clean(self) -> None:
        self._write(
            "backend/services/catalog/Catalog.Api/DatabaseMigrator.cs",
            "await dbContext.Database.MigrateAsync(cancellationToken);\n",
        )

        self.assertEqual(ag.check_bootstrap_advisory_lock_absent(), [])

    def test_superuser_application_connection_is_blocking(self) -> None:
        self._write(
            "infra/docker-compose.yml",
            "- ConnectionStrings__Default=Host=postgres;Username=postgres;Password=postgres\n",
        )

        findings = ag.check_database_boundary_configuration()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].category, "service-uses-database-superuser")

    def test_destructive_up_migration_requires_safety_marker(self) -> None:
        self._write(
            "backend/services/x/X.Infrastructure/Persistence/Migrations/20990101000000_DropLegacy.cs",
            "\n".join(
                [
                    "protected override void Up(MigrationBuilder migrationBuilder)",
                    "{",
                    '    migrationBuilder.DropTable(name: "Legacy");',
                    "}",
                    "protected override void Down(MigrationBuilder migrationBuilder) { }",
                    "",
                ]
            ),
        )

        findings = ag.check_destructive_migration_safety()

        self.assertEqual(len(findings), 1)
        self.assertEqual(
            findings[0].category,
            "destructive-migration-without-safety-plan",
        )

    def test_reviewed_destructive_up_migration_is_clean(self) -> None:
        self._write(
            "backend/services/x/X.Infrastructure/Persistence/Migrations/20990101000000_DropLegacy.cs",
            "\n".join(
                [
                    "protected override void Up(MigrationBuilder migrationBuilder)",
                    "{",
                    "    // migration-safety: backup and rollback reviewed",
                    '    migrationBuilder.DropTable(name: "Legacy");',
                    "}",
                    "protected override void Down(MigrationBuilder migrationBuilder) { }",
                    "",
                ]
            ),
        )

        self.assertEqual(ag.check_destructive_migration_safety(), [])

    # -- full run --------------------------------------------------------------

    def test_run_all_on_clean_repo_has_no_blocking_findings(self) -> None:
        self._write(
            "backend/services/x/X.Application/Foo/CreateFoo/CreateFooCommandHandler.cs",
            "public sealed class CreateFooCommandHandler { }\n",
        )
        self._write(
            "backend/services/x/X.Application/Foo/CreateFoo/CreateFooCommandValidator.cs",
            "public sealed class CreateFooCommandValidator { public CreateFooCommandValidator() { } }\n",
        )
        self._write(
            "backend/services/x/X.Domain/Entities/Foo.cs",
            "public static DomainResult<Foo> Create(string name) => DomainResult.Success(new Foo(name));\n",
        )
        self._write(
            "apps/admin-frontend/src/features/catalog/domain/entities/Foo.ts",
            "export class Foo { private readonly name: string; constructor(name: string) { this.name = name } }\n",
        )

        findings = ag.run_all()
        blocking = [f for f in findings if f.severity == "blocking"]

        self.assertEqual(blocking, [])


if __name__ == "__main__":
    unittest.main()
