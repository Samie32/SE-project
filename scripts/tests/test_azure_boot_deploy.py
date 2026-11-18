import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]


class BootDeployTests(unittest.TestCase):
    def setUp(self):
        path = ROOT / "scripts/check-azure-demo-on-boot.py"
        self.assertTrue(path.is_file(), "VM boot check script is missing")
        spec = importlib.util.spec_from_file_location("boot_deploy", path)
        self.boot = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.boot)
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.marker = Path(temp.name) / "deployed-sha"
        self.sha = "b" * 40

    def check(self, remote, jobs):
        responses = [{"workflow_runs": [{"id": 7, "head_sha": self.sha}]}]
        responses.append({"jobs": jobs})
        with (
            patch.object(self.boot, "DEPLOYED_SHA", self.marker),
            patch.object(self.boot, "main_sha", return_value=remote),
            patch.object(self.boot, "github", side_effect=responses) as github,
            patch.object(self.boot.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run,
        ):
            status = self.boot.check()
        return status, run, github

    def jobs(self, deploy="failure", backend="success"):
        return [
            {"name": "frontend / verify", "conclusion": "success"},
            {"name": "backend / verify", "conclusion": backend},
            {"name": "api-contract / validate", "conclusion": "success"},
            {"name": "deploy", "conclusion": deploy},
        ]

    def test_matching_commit_skips_api_and_docker(self):
        self.marker.write_text(self.sha, encoding="ascii")
        status, run, github = self.check(self.sha, [])
        self.assertEqual(status, 0)
        run.assert_not_called()
        github.assert_not_called()

    def test_failed_vm_job_can_be_recovered_after_passing_ci(self):
        self.marker.write_text("a" * 40, encoding="ascii")
        status, run, _ = self.check(self.sha, self.jobs())
        self.assertEqual(status, 0)
        self.assertEqual(run.call_args.kwargs["env"]["DEPLOY_SHA"], self.sha)
        self.assertEqual(run.call_args.kwargs["env"]["SKIP_IF_DEPLOYED"], "1")

    def test_incomplete_or_failing_ci_does_not_deploy(self):
        for backend in (None, "failure"):
            with self.subTest(backend=backend):
                status, run, _ = self.check(self.sha, self.jobs(backend=backend))
                self.assertNotEqual(status, 0)
                run.assert_not_called()

    def test_skipped_deploy_does_not_update(self):
        _, run, _ = self.check(self.sha, self.jobs(deploy="skipped"))
        run.assert_not_called()
