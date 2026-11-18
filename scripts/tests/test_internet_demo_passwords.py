import contextlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


prepare = load_module("prepare_internet", "scripts/prepare-internet.py")
loader = load_module("load_local_demo", "data_demo/load_local_demo.py")
TEMPLATE = ROOT / "infra/keycloak/realm-template.json"


class InternetDemoPasswordTests(unittest.TestCase):
    @patch.dict("os.environ", {}, clear=True)
    def test_fresh_install_sets_default_only_for_doctor_and_patient(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            template = root / "infra/keycloak/realm-template.json"
            template.parent.mkdir(parents=True)
            template.write_bytes(TEMPLATE.read_bytes())
            args = ["prepare-internet.py", "--app-host", "clinic.example.org",
                    "--auth-host", "auth.example.org", "--turn-public-ip", "1.1.1.1"]
            with patch.object(prepare, "ROOT", root), patch("sys.argv", args):
                prepare.main()
            realm = json.loads((root / "infra/runtime/internet/clinic-realm.json").read_text(encoding="utf-8"))
            accounts = {user["username"]: user["credentials"][0]["value"] for user in realm["users"]}
            self.assertEqual(accounts["doctor"], "DemoClinic")
            self.assertEqual(accounts["patient"], "DemoClinic")
            self.assertEqual(len(accounts["admin"]), 32)

    @patch.dict("os.environ", {}, clear=True)
    def test_existing_stack_updates_only_two_demo_logins(self):
        realm = json.loads(TEMPLATE.read_text(encoding="utf-8-sig"))
        ids = {user["username"]: user["id"] for user in realm["users"]}
        with tempfile.TemporaryDirectory() as tmp:
            runtime = Path(tmp) / "infra/runtime/internet"
            runtime.mkdir(parents=True)
            (runtime / "clinic-realm.json").write_text(json.dumps(realm), encoding="utf-8")
            env_path = Path(tmp) / ".env.internet"
            env_path.touch()
            args = ["load_local_demo.py", "--internet", "--demo-logins", "--apply"]
            def credentials(*, seed_data):
                self.assertFalse(seed_data)
                env = loader.read_env(Path(tmp) / ".env.internet")
                return contextlib.nullcontext(("admin-token", {}, env.get("DEMO_PASSWORD")))
            with patch.object(loader, "ROOT", Path(tmp)), patch("sys.argv", args), \
                    patch.object(loader, "internet_credentials", credentials), \
                    patch.object(loader, "demo_login") as login, patch.object(loader, "load_data") as seed:
                loader.main()
                env_path.write_text("DEMO_PASSWORD=ClinicCustom123\n", encoding="utf-8")
                loader.main()
            expected = [("admin-token", name, password, ids[name])
                        for password in ("DemoClinic", "ClinicCustom123")
                        for name in ("doctor", "patient")]
            self.assertEqual([call.args for call in login.call_args_list], expected)
            seed.assert_not_called()


if __name__ == "__main__":
    unittest.main()
