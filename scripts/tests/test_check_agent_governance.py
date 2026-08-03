import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import check_agent_governance as cag  # noqa: E402
import sync_agent_skills as sas  # noqa: E402


class GovernanceCheckTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)

    def _write(self, rel: str, content: str) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def _base_repo(self) -> None:
        self._write("AGENTS.md", "root rules\n")
        self._write("backend/AGENTS.md", "backend rules\n")
        self._write("apps/admin-frontend/AGENTS.md", "frontend rules\n")
        self._write("CLAUDE.md", "@AGENTS.md\n")
        self._write("backend/CLAUDE.md", "@AGENTS.md\n")
        self._write("apps/admin-frontend/CLAUDE.md", "@AGENTS.md\n")
        self._write(
            ".github/copilot-instructions.md",
            "Read the root `AGENTS.md` and nearest nested `AGENTS.md`.\n"
            "Use .agents/skills/ when relevant.\n",
        )
        self._write(".gitignore", "**/.claude/settings.local.json\n")
        self._write(
            "apps/admin-frontend/package.json",
            json.dumps({"scripts": {"lint": "eslint .", "build": "tsc -b && vite build"}}),
        )

    def _patch(self):
        return mock.patch.multiple(
            cag,
            REPO_ROOT=self.root,
            REQUIRED_AGENTS_MD=[
                self.root / "AGENTS.md",
                self.root / "backend" / "AGENTS.md",
                self.root / "apps" / "admin-frontend" / "AGENTS.md",
            ],
            REQUIRED_CLAUDE_MD=[
                self.root / "CLAUDE.md",
                self.root / "backend" / "CLAUDE.md",
                self.root / "apps" / "admin-frontend" / "CLAUDE.md",
            ],
            REQUIRED_COPILOT_INSTRUCTIONS=self.root / ".github" / "copilot-instructions.md",
            GOVERNANCE_DOC_GLOBS=[
                "AGENTS.md",
                "backend/AGENTS.md",
                "apps/admin-frontend/AGENTS.md",
                "docs/AGENT-GOVERNANCE.md",
            ],
        )

    # -- AGENTS.md / CLAUDE.md -------------------------------------------------

    def test_missing_agents_md_is_reported(self) -> None:
        with self._patch():
            problems = cag.check_agents_md_exists()

        self.assertEqual(len(problems), 3)

    def test_present_agents_md_passes(self) -> None:
        self._base_repo()
        with self._patch():
            problems = cag.check_agents_md_exists()

        self.assertEqual(problems, [])

    def test_claude_md_missing_import_is_reported(self) -> None:
        self._base_repo()
        self._write("CLAUDE.md", "no import here\n")

        with self._patch():
            problems = cag.check_claude_md_imports()

        self.assertTrue(any("must contain only" in p for p in problems))

    def test_claude_md_with_import_passes(self) -> None:
        self._base_repo()
        with self._patch():
            problems = cag.check_claude_md_imports()

        self.assertEqual(problems, [])

    def test_claude_md_with_duplicate_instructions_is_reported(self) -> None:
        self._base_repo()
        self._write("CLAUDE.md", "@AGENTS.md\n\nRun tests again.\n")

        with self._patch():
            problems = cag.check_claude_md_imports()

        self.assertTrue(any("must contain only" in p for p in problems))

    def test_missing_copilot_bridge_is_reported(self) -> None:
        with self._patch():
            problems = cag.check_copilot_bridge()

        self.assertTrue(any("copilot-instructions.md" in p for p in problems))

    def test_valid_copilot_bridge_passes(self) -> None:
        self._base_repo()
        with self._patch():
            problems = cag.check_copilot_bridge()

        self.assertEqual(problems, [])

    def test_missing_local_settings_ignore_is_reported(self) -> None:
        self._write(".gitignore", "node_modules/\n")
        with self._patch():
            problems = cag.check_local_agent_state_ignored()

        self.assertTrue(any("settings.local.json" in p for p in problems))

    def test_local_settings_ignore_passes(self) -> None:
        self._base_repo()
        with self._patch():
            problems = cag.check_local_agent_state_ignored()

        self.assertEqual(problems, [])

    def test_removed_visualization_term_is_reported(self) -> None:
        removed_term = "graph" + "ify"
        self._write("apps/admin-frontend/.prettierignore", f"{removed_term}-out\n")
        with self._patch():
            problems = cag.check_removed_product_terms_absent()

        self.assertTrue(any(removed_term in problem for problem in problems))

    def test_removed_product_scan_ignores_local_caches(self) -> None:
        self._write("backend/.vs/session.txt", "graph" + "ify\n")
        with self._patch():
            problems = cag.check_removed_product_terms_absent()

        self.assertEqual(problems, [])

    # -- skill frontmatter -------------------------------------------------

    def test_skill_frontmatter_missing_description_is_reported(self) -> None:
        self._write(".agents/skills/foo/SKILL.md", "---\nname: foo\n---\n\n# Foo\n")

        with self._patch():
            problems = cag.check_skill_frontmatter()

        self.assertTrue(any("description" in p for p in problems))

    def test_skill_frontmatter_name_mismatch_is_reported(self) -> None:
        self._write(".agents/skills/foo/SKILL.md", "---\nname: bar\ndescription: does things\n---\n")

        with self._patch():
            problems = cag.check_skill_frontmatter()

        self.assertTrue(any("!=" in p for p in problems))

    def test_skill_frontmatter_forbidden_key_is_reported(self) -> None:
        self._write(
            ".agents/skills/foo/SKILL.md",
            "---\nname: foo\ndescription: does things\nallowed-tools: Read\n---\n",
        )

        with self._patch():
            problems = cag.check_skill_frontmatter()

        self.assertTrue(any("allowed-tools" in p for p in problems))

    def test_skill_frontmatter_valid_passes(self) -> None:
        self._write(".agents/skills/foo/SKILL.md", "---\nname: foo\ndescription: does things\n---\n\n# Foo\n")

        with self._patch():
            problems = cag.check_skill_frontmatter()

        self.assertEqual(problems, [])

    def test_colon_in_a_wrapped_description_continuation_is_not_a_forbidden_key(self) -> None:
        # The description's folded (">") value wraps onto an indented
        # continuation line that itself starts with "model:" (quoting an
        # example config key). A naive re-split of the raw frontmatter text
        # (independent of _parse_frontmatter's continuation-aware logic)
        # would misread that continuation line as a genuine top-level
        # "model:" key and false-positive against FORBIDDEN_FRONTMATTER_KEYS,
        # even though _parse_frontmatter itself correctly folds it into the
        # description value.
        self._write(
            ".agents/skills/foo/SKILL.md",
            "\n".join(
                [
                    "---",
                    "name: foo",
                    "description: >",
                    "  Use whenever the request looks like a config diff, e.g.",
                    "  model: gpt-4-turbo",
                    "  or a similar provider-settings change.",
                    "---",
                    "",
                ]
            ),
        )

        with self._patch():
            problems = cag.check_skill_frontmatter()

        self.assertEqual(problems, [])

    # -- skill sync ----------------------------------------------------------

    def test_unsynced_skills_are_reported_for_claude_target(self) -> None:
        self._write(".agents/skills/foo/SKILL.md", "---\nname: foo\ndescription: does things\n---\n")
        claude_target = self.root / ".claude" / "skills"

        with self._patch(), mock.patch.object(sas, "TARGET_DIRS", [claude_target]):
            problems = cag.check_skills_synced()

        self.assertTrue(any(".claude/skills" in p for p in problems))

    def test_synced_skills_pass(self) -> None:
        self._write(".agents/skills/foo/SKILL.md", "---\nname: foo\ndescription: does things\n---\n")
        claude_target = self.root / ".claude" / "skills"
        sas.sync_target(self.root / ".agents" / "skills", claude_target)

        with self._patch(), mock.patch.object(sas, "TARGET_DIRS", [claude_target]):
            problems = cag.check_skills_synced()

        self.assertEqual(problems, [])

    # -- .codex/skills ---------------------------------------------------------

    def test_codex_skills_dir_present_is_reported(self) -> None:
        (self.root / ".codex" / "skills").mkdir(parents=True)

        with self._patch():
            problems = cag.check_no_codex_skills_dir()

        self.assertEqual(len(problems), 1)

    def test_codex_skills_dir_absent_passes(self) -> None:
        with self._patch():
            problems = cag.check_no_codex_skills_dir()

        self.assertEqual(problems, [])

    # -- legacy/stale instruction layers --------------------------------------

    def test_local_skill_directory_is_reported(self) -> None:
        self._write("backend/.skills/legacy/SKILL.md", "legacy\n")

        with self._patch():
            problems = cag.check_no_legacy_instruction_layers()

        self.assertTrue(any("backend/.skills" in problem for problem in problems))

    def test_standalone_agent_file_is_reported(self) -> None:
        self._write("apps/admin-frontend/.agent.md", "duplicate rules\n")

        with self._patch():
            problems = cag.check_no_legacy_instruction_layers()

        self.assertTrue(any(".agent.md" in problem for problem in problems))

    def test_old_canonical_skill_directory_is_reported(self) -> None:
        self._write("agent-skills/legacy/SKILL.md", "legacy\n")

        with self._patch():
            problems = cag.check_no_legacy_instruction_layers()

        self.assertTrue(any("agent-skills" in problem for problem in problems))

    def test_tool_specific_agents_are_reported(self) -> None:
        self._write(".claude/agents/reviewer.md", "duplicate workflow\n")

        with self._patch():
            problems = cag.check_no_legacy_instruction_layers()

        self.assertTrue(any(".claude/agents" in problem for problem in problems))

    def test_prompt_directory_is_reported(self) -> None:
        self._write("prompts/task.md", "duplicate workflow\n")

        with self._patch():
            problems = cag.check_no_legacy_instruction_layers()

        self.assertTrue(any("prompts" in problem for problem in problems))

    def test_stale_phrase_in_skill_reference_is_reported(self) -> None:
        self._write(
            ".agents/skills/foo/references/testing.md",
            "Automatic tenant assignment has no automated regression test\n",
        )

        with self._patch():
            problems = cag.check_no_known_stale_teaching()

        self.assertTrue(any("no automated regression" in problem for problem in problems))

    def test_versioned_package_reference_in_new_service_skill_is_reported(self) -> None:
        self._write(
            ".agents/skills/agenza-backend-new-service/SKILL.md",
            '<PackageReference Include="Example" Version="1.0.0" />\n',
        )

        with self._patch():
            problems = cag.check_no_known_stale_teaching()

        self.assertTrue(any("versioned PackageReference" in problem for problem in problems))

    def test_legacy_instruction_layers_absent_passes(self) -> None:
        with self._patch():
            problems = cag.check_no_legacy_instruction_layers()

        self.assertEqual(problems, [])

    # -- ADR references ----------------------------------------------------

    def test_dangling_adr_reference_is_reported(self) -> None:
        self._write("AGENTS.md", "See docs/adr/0099 for details.\n")
        self._write("docs/adr/0001-something.md", "# ADR\n")

        with self._patch():
            problems = cag.check_adr_references()

        self.assertTrue(any("0099" in p for p in problems))

    def test_valid_adr_reference_passes(self) -> None:
        self._write("AGENTS.md", "See docs/adr/0001 for details.\n")
        self._write("docs/adr/0001-something.md", "# ADR\n")

        with self._patch():
            problems = cag.check_adr_references()

        self.assertEqual(problems, [])

    # -- referenced skills -------------------------------------------------

    def test_missing_referenced_skill_is_reported(self) -> None:
        self._write("AGENTS.md", "Use .agents/skills/missing-skill for this task.\n")

        with self._patch():
            problems = cag.check_referenced_skills_exist()

        self.assertEqual(
            problems,
            ["referenced skill .agents/skills/missing-skill does not exist"],
        )

    def test_present_referenced_skill_passes(self) -> None:
        self._write("AGENTS.md", "Use .agents/skills/present-skill for this task.\n")
        self._write(
            ".agents/skills/present-skill/SKILL.md",
            "---\nname: present-skill\ndescription: does things\n---\n",
        )

        with self._patch():
            problems = cag.check_referenced_skills_exist()

        self.assertEqual(problems, [])

    # -- referenced scripts --------------------------------------------------

    def test_missing_referenced_script_is_reported(self) -> None:
        self._base_repo()
        self._write("AGENTS.md", "Run scripts/does_not_exist.py before finishing.\n")

        with self._patch():
            problems = cag.check_referenced_scripts_exist()

        self.assertTrue(any("does_not_exist.py" in p for p in problems))

    def test_missing_referenced_script_in_skill_is_reported(self) -> None:
        self._base_repo()
        self._write(
            ".agents/skills/some-reviewer/SKILL.md",
            "---\nname: some-reviewer\ndescription: review\n---\nRun scripts/does_not_exist.py.\n",
        )

        with self._patch():
            problems = cag.check_referenced_scripts_exist()

        self.assertTrue(any("does_not_exist.py" in p for p in problems))

    def test_missing_adr_reference_in_skill_is_reported(self) -> None:
        self._write("docs/adr/0001-something.md", "# ADR\n")
        self._write(
            ".agents/skills/some-skill/SKILL.md",
            "---\nname: some-skill\ndescription: test\n---\nSee docs/adr/0099.\n",
        )

        with self._patch():
            problems = cag.check_adr_references()

        self.assertTrue(any("0099" in p for p in problems))

    def test_present_referenced_script_passes(self) -> None:
        self._base_repo()
        self._write("AGENTS.md", "Run scripts/real_script.py before finishing.\n")
        self._write("scripts/real_script.py", "# real\n")

        with self._patch():
            problems = cag.check_referenced_scripts_exist()

        self.assertEqual(problems, [])

    # -- documented npm commands ---------------------------------------------

    def test_undocumented_npm_command_is_reported(self) -> None:
        self._base_repo()
        self._write("AGENTS.md", "Run `npm run nonexistent-script --workspace=apps/admin-frontend`.\n")

        with self._patch():
            problems = cag.check_documented_npm_commands()

        self.assertTrue(any("nonexistent-script" in p for p in problems))

    def test_documented_npm_command_that_exists_passes(self) -> None:
        self._base_repo()
        self._write("AGENTS.md", "Run `npm run lint --workspace=apps/admin-frontend`.\n")

        with self._patch():
            problems = cag.check_documented_npm_commands()

        self.assertEqual(problems, [])

    # -- full clean pass -------------------------------------------------------

    def test_run_checks_clean_repo_has_no_problems(self) -> None:
        self._base_repo()
        self._write(".agents/skills/foo/SKILL.md", "---\nname: foo\ndescription: does things\n---\n")
        self._write("docs/adr/0001-something.md", "# ADR\n")
        claude_target = self.root / ".claude" / "skills"
        sas.sync_target(self.root / ".agents" / "skills", claude_target)

        with self._patch(), mock.patch.object(sas, "TARGET_DIRS", [claude_target]):
            problems = cag.run_checks()

        self.assertEqual(problems, [])


if __name__ == "__main__":
    unittest.main()
