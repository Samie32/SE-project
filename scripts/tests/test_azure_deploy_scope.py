import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]


@unittest.skipUnless(os.name == "posix" and shutil.which("flock"), "requires Linux deployment tools")
class DeployScopeTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.source = self.root / "source"
        self.checkout = self.root / "checkout"
        self.state = self.root / "state"
        self.state.mkdir()
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.units = self.root / "units"
        self.units.mkdir()
        self.env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", FIXTURE=str(self.root))
        self.git("init", "-q", "-b", "main", str(self.source), cwd=self.root)
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.com")
        loader = self.source / "scripts/run-with-azure-smtp.py"
        loader.parent.mkdir()
        loader.write_text("import os, sys\nos.execvp(sys.argv[1], sys.argv[1:])\n")
        self.git("add", "--", str(loader))
        base = self.commit("infra/internet/cliniccare-boot-deploy.service")
        (self.state / "deployed-sha").write_text(base + "\n")
        self.git("clone", "-q", str(self.source), str(self.checkout), cwd=self.root)

        self.stub("docker", """printf '%s\\n' "$*" >> "$FIXTURE/docker.log"
case "$*" in
  *'printenv APP_HOST') echo clinic.example.org ;;
  *'run --rm auth-config') echo CLINICCARE_REGISTRATION_CONFIGURED ;;
esac""")
        self.stub("curl", """case "$*" in
  *'/api/me/profile') printf '401' ;;
esac""")
        self.stub("systemctl", "exit 0")
        self.script = self.root / "deploy"
        body = (ROOT / "scripts/deploy-azure-demo.sh").read_text()
        for live, fixture in (
            ("/opt/cliniccare", self.checkout),
            ("/var/lock/cliniccare-deploy.lock", self.root / "deploy.lock"),
            ("/var/lib/cliniccare", self.state),
            ("/etc/systemd/system/", str(self.units) + "/"),
        ):
            body = body.replace(live, str(fixture))
        self.script.write_text(body)

    def git(self, *args, cwd=None):
        return subprocess.check_output(["git", *args], cwd=cwd or self.source, text=True).strip()

    def commit(self, path):
        file = self.source / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(path + "\n")
        self.git("add", "--", path)
        self.git("commit", "-qm", path)
        return self.git("rev-parse", "HEAD")

    def stub(self, name, body):
        path = self.bin / name
        path.write_text(f"#!/bin/sh\n{body}\n")
        path.chmod(0o755)

    def deploy(self, target, **env):
        subprocess.run(
            ["sh", str(self.script)], env=dict(self.env, DEPLOY_SHA=target, **env),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True,
        )
        self.assertEqual((self.state / "deployed-sha").read_text().strip(), target)
        log = self.root / "docker.log"
        return log.read_text() if log.exists() else ""

    def test_documentation_only_does_not_run_docker(self):
        self.assertEqual(self.deploy(self.commit("docs/deploy.md")), "")

    def test_frontend_and_docs_only_build_frontend(self):
        self.commit("docs/deploy.md")
        commands = self.deploy(self.commit("frontend/src/App.tsx"))
        self.assertIn("up -d --build --no-deps frontend", commands)
        self.assertNotIn("restart frontend", commands)

    def test_missed_backend_commit_requires_full_deploy(self):
        self.commit("backend/service.java")
        commands = self.deploy(self.commit("frontend/src/App.tsx"))
        self.assertIn("up -d --build\n", commands)
        self.assertIn("restart frontend", commands)

    def test_pending_deploy_requires_full_recovery(self):
        (self.state / "deploy-pending").touch()
        commands = self.deploy(self.commit("docs/deploy.md"))
        self.assertIn("up -d --build\n", commands)
        self.assertFalse((self.state / "deploy-pending").exists())

    def test_manual_deploy_can_reconcile_all_services(self):
        commands = self.deploy(self.commit("docs/deploy.md"), DEPLOY_FORCE_FULL="1")
        self.assertIn("up -d --build\n", commands)

    def test_failed_health_check_rolls_back_to_previous_commit(self):
        prev = (self.state / "deployed-sha").read_text().strip()
        broken = self.commit("backend/broken.java")
        self.stub("docker", """printf '%s\\n' "$*" >> "$FIXTURE/docker.log"
case "$*" in
  *'run --rm auth-config') echo CLINICCARE_REGISTRATION_CONFIGURED ;;
  *'wget -q -T 3 -O /dev/null http://backend:8080/actuator/health')
    if [ "$(git -C "$FIXTURE/checkout" rev-parse HEAD)" = """ + f'"{broken}"' + """ ]; then
      exit 1
    fi
    exit 0 ;;
esac""")
        res = subprocess.run(
            ["sh", str(self.script)],
            env=dict(self.env, DEPLOY_SHA=broken, DEPLOY_HEALTH_ATTEMPTS="1", DEPLOY_HEALTH_SLEEP="0"),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        self.assertNotEqual(res.returncode, 0)
        self.assertIn(f"CLINICCARE_DEPLOY_ROLLED_BACK {broken} {prev}", res.stdout)
        self.assertEqual(self.git("rev-parse", "HEAD", cwd=self.checkout), prev)
        self.assertEqual((self.state / "deployed-sha").read_text().strip(), prev)
        self.assertFalse((self.state / "deploy-pending").exists())
