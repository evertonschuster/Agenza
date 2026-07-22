import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import sync_agent_skills as sas  # noqa: E402


class DiffTargetTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        self.source = self.root / "source"
        self.target = self.root / "target"
        self.source.mkdir()
        self.target.mkdir()

    @staticmethod
    def _write(base: Path, rel: str, content: str) -> None:
        path = base / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def test_missing_file_in_target(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "hello")

        missing, divergent, extra = sas.diff_target(self.source, self.target)

        self.assertEqual(missing, [Path("skill-a/SKILL.md")])
        self.assertEqual(divergent, [])
        self.assertEqual(extra, [])

    def test_divergent_content(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "version 2")
        self._write(self.target, "skill-a/SKILL.md", "version 1")

        missing, divergent, extra = sas.diff_target(self.source, self.target)

        self.assertEqual(missing, [])
        self.assertEqual(divergent, [Path("skill-a/SKILL.md")])
        self.assertEqual(extra, [])

    def test_extra_file_in_target(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "hello")
        self._write(self.target, "skill-a/SKILL.md", "hello")
        self._write(self.target, "skill-b/SKILL.md", "orphaned")

        missing, divergent, extra = sas.diff_target(self.source, self.target)

        self.assertEqual(missing, [])
        self.assertEqual(divergent, [])
        self.assertEqual(extra, [Path("skill-b/SKILL.md")])

    def test_identical_content_is_not_divergent_even_with_different_mtime(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "same content")
        self._write(self.target, "skill-a/SKILL.md", "same content")
        # Touch target with a different mtime - comparison must be by content, not mtime.
        (self.target / "skill-a" / "SKILL.md").touch()

        missing, divergent, extra = sas.diff_target(self.source, self.target)

        self.assertEqual((missing, divergent, extra), ([], [], []))

    def test_sync_target_makes_target_match_source(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "hello")
        self._write(self.source, "skill-a/references/notes.md", "notes")

        changed = sas.sync_target(self.source, self.target)

        self.assertTrue(changed)
        missing, divergent, extra = sas.diff_target(self.source, self.target)
        self.assertEqual((missing, divergent, extra), ([], [], []))

    def test_sync_removes_extra_files_and_empty_directories(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "hello")
        self._write(self.target, "skill-a/SKILL.md", "hello")
        self._write(self.target, "skill-b/SKILL.md", "stale")

        sas.sync_target(self.source, self.target)

        self.assertFalse((self.target / "skill-b").exists())

    def test_sync_target_reports_no_change_when_already_in_sync(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "hello")
        sas.sync_target(self.source, self.target)

        changed_again = sas.sync_target(self.source, self.target)

        self.assertFalse(changed_again)

    def test_main_check_mode_returns_nonzero_on_divergence(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "hello")

        exit_code = sas.main(["--check", "--source", str(self.source), "--targets", str(self.target)])

        self.assertEqual(exit_code, 1)

    def test_main_check_mode_returns_zero_when_in_sync(self) -> None:
        self._write(self.source, "skill-a/SKILL.md", "hello")
        sas.sync_target(self.source, self.target)

        exit_code = sas.main(["--check", "--source", str(self.source), "--targets", str(self.target)])

        self.assertEqual(exit_code, 0)


if __name__ == "__main__":
    unittest.main()
