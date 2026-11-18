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
    def test_fresh_install_sets_default_for_all_clinic_accounts(self):
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
            self.assertEqual(set(accounts.values()), {"DemoClinic"})
            env = loader.read_env(root / ".env.internet")
            self.assertNotEqual(env["KEYCLOAK_ADMIN_PASSWORD"], "DemoClinic")

    @patch.dict("os.environ", {}, clear=True)
    def test_existing_stack_updates_seeded_and_existing_sample_logins(self):
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
            accounts = {
                loader.DOCTOR: (loader.DOCTOR_GIVEN_NAME, loader.DOCTOR_FAMILY_NAME),
                loader.PATIENT: (loader.PATIENT_GIVEN_NAME, loader.PATIENT_FAMILY_NAME),
            }
            accounts.update({name: (given, family) for name, given, family, _ in loader.EXTRA_DOCTORS})

            def sample_users(admin, username):
                if username not in accounts:
                    return []
                given, family = accounts[username]
                return [{"id": f"{username}-id", "username": username, "email": f"{username}@example.test",
                         "firstName": given, "lastName": family}]

            with patch.object(loader, "ROOT", Path(tmp)), patch("sys.argv", args), \
                    patch.object(loader, "internet_credentials", credentials), \
                    patch.object(loader, "keycloak_users", side_effect=sample_users), \
                    patch.object(loader, "demo_login") as login, patch.object(loader, "load_data") as seed:
                loader.main()
                del accounts[loader.PATIENT]
                env_path.write_text("DEMO_PASSWORD=ClinicCustom123\n", encoding="utf-8")
                loader.main()
            all_ids = {**ids, **{name: f"{name}-id" for name in
                                 (loader.DOCTOR, loader.PATIENT, *(user[0] for user in loader.EXTRA_DOCTORS))}}
            self.assertEqual(len(all_ids), 14)
            expected = [("admin-token", name, "DemoClinic", user_id) for name, user_id in all_ids.items()]
            expected.extend(("admin-token", name, "ClinicCustom123", user_id)
                            for name, user_id in all_ids.items() if name != loader.PATIENT)
            self.assertEqual([call.args for call in login.call_args_list], expected)
            seed.assert_not_called()


if __name__ == "__main__":
    unittest.main()
