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

    # -- cross-page imports ------------------------------------------------

    def test_cross_page_import_is_blocking(self) -> None:
        self._write(
            "apps/admin-frontend/src/presentation/pages/PageA/Foo.ts",
            "import { bar } from '../PageB/bar'\n",
        )
        self._write("apps/admin-frontend/src/presentation/pages/PageB/bar.ts", "export const bar = 1\n")

        findings = ag.check_cross_page_imports()

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "blocking")

    def test_same_page_import_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/src/presentation/pages/PageA/Foo.ts",
            "import { helper } from './helper'\n",
        )

        findings = ag.check_cross_page_imports()

        self.assertEqual(findings, [])

    def test_import_outside_pages_dir_is_clean(self) -> None:
        self._write(
            "apps/admin-frontend/src/presentation/pages/PageA/Foo.ts",
            "import { Button } from '../../../components/ui/button'\n",
        )

        findings = ag.check_cross_page_imports()

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
                    "    'src/presentation/routes/router.tsx',",
                    "    'src/presentation/pages/StubPage/**',",
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
            "apps/admin-frontend/src/domain/entities/Foo.ts",
            "export class Foo { private readonly name: string; constructor(name: string) { this.name = name } }\n",
        )

        findings = ag.run_all()
        blocking = [f for f in findings if f.severity == "blocking"]

        self.assertEqual(blocking, [])


if __name__ == "__main__":
    unittest.main()
