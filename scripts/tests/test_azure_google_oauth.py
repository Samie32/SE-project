import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError


oauth_path = Path(__file__).resolve().parents[1] / "run-with-azure-google-oauth.py"
oauth_spec = importlib.util.spec_from_file_location("azure_google_oauth", oauth_path)
google_oauth = importlib.util.module_from_spec(oauth_spec)
oauth_spec.loader.exec_module(google_oauth)

kc_path = Path(__file__).resolve().parents[1] / "configure-keycloak-registration.py"
kc_spec = importlib.util.spec_from_file_location("kc_registration", kc_path)
kc_reg = importlib.util.module_from_spec(kc_spec)
kc_spec.loader.exec_module(kc_reg)


class AzureGoogleOAuthTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.config = Path(directory.name) / "google-oauth.json"
        config_patch = patch.object(google_oauth, "CONFIG", self.config)
        config_patch.start()
        self.addCleanup(config_patch.stop)
        self.credentials = {"clientId": "test-client-id.apps.googleusercontent.com", "clientSecret": "test-secret"}

    def test_no_configuration_returns_empty_environment(self):
        self.assertEqual(google_oauth.oauth_environment(), {})

    def test_store_is_idempotent_and_exports_env(self):
        self.assertTrue(google_oauth.store(json.dumps(self.credentials)))
        self.assertFalse(google_oauth.store(json.dumps(self.credentials)))
        if os.name == "posix":
            self.assertEqual(stat.S_IMODE(self.config.stat().st_mode), 0o600)
        settings = google_oauth.oauth_environment()
        self.assertEqual(settings["GOOGLE_CLIENT_ID"], self.credentials["clientId"])
        self.assertEqual(settings["GOOGLE_CLIENT_SECRET"], self.credentials["clientSecret"])

    def test_invalid_secret_does_not_overwrite_existing_configuration(self):
        google_oauth.store(json.dumps(self.credentials))
        with self.assertRaisesRegex(ValueError, "Invalid Google OAuth configuration"):
            google_oauth.store(json.dumps(self.credentials | {"clientSecret": "bad\nsecret"}))
        self.assertEqual(google_oauth.oauth_environment()["GOOGLE_CLIENT_SECRET"], "test-secret")

    def test_accepts_google_console_json_and_key_value_formats(self):
        console_json = json.dumps({
            "web": {
                "client_id": "console-id.apps.googleusercontent.com",
                "client_secret": "console-secret",
            }
        })
        self.assertTrue(google_oauth.store(console_json))
        self.assertEqual(google_oauth.oauth_environment()["GOOGLE_CLIENT_ID"], "console-id.apps.googleusercontent.com")
        self.assertEqual(google_oauth.oauth_environment()["GOOGLE_CLIENT_SECRET"], "console-secret")

        kv_raw = "GOOGLE_CLIENT_ID=kv-id\nGOOGLE_CLIENT_SECRET=kv-secret\n"
        self.assertTrue(google_oauth.store(kv_raw))
        self.assertEqual(google_oauth.oauth_environment()["GOOGLE_CLIENT_ID"], "kv-id")
        self.assertEqual(google_oauth.oauth_environment()["GOOGLE_CLIENT_SECRET"], "kv-secret")

    def test_configure_google_idp_creates_when_missing(self):
        opener = MagicMock()
        not_found = HTTPError(
            "http://keycloak:8080/admin/realms/clinic/identity-provider/instances/google",
            404,
            "Not Found",
            {},
            None,
        )
        post_response = MagicMock()
        post_response.__enter__.return_value = post_response
        opener.open.side_effect = [not_found, post_response]

        kc_reg.configure_google_idp(opener, "http://keycloak:8080", "tok", "cid", "csec")

        self.assertEqual(opener.open.call_count, 2)
        second_req = opener.open.call_args_list[1].args[0]
        self.assertEqual(second_req.get_method(), "POST")
        body = json.loads(second_req.data.decode("utf-8"))
        self.assertEqual(body["alias"], "google")
        self.assertTrue(body["trustEmail"])
        self.assertEqual(body["config"]["clientId"], "cid")
        self.assertEqual(body["config"]["clientSecret"], "csec")

    def test_configure_google_idp_updates_when_present(self):
        opener = MagicMock()
        ok_response = MagicMock()
        ok_response.__enter__.return_value = ok_response
        opener.open.side_effect = [ok_response, ok_response]

        kc_reg.configure_google_idp(opener, "http://keycloak:8080", "tok", "cid2", "csec2")

        self.assertEqual(opener.open.call_count, 2)
        second_req = opener.open.call_args_list[1].args[0]
        self.assertEqual(second_req.get_method(), "PUT")
        self.assertTrue(second_req.full_url.endswith("/identity-provider/instances/google"))
