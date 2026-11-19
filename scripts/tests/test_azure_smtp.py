import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch


path = Path(__file__).resolve().parents[1] / "run-with-azure-smtp.py"
spec = importlib.util.spec_from_file_location("azure_smtp", path)
smtp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smtp)


class AzureSmtpTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.config = Path(directory.name) / "smtp.json"
        config_patch = patch.object(smtp, "CONFIG", self.config)
        config_patch.start()
        self.addCleanup(config_patch.stop)
        self.credentials = {"username": "smtp-user", "password": "test-key", "from": "clinic@example.test"}

    def test_no_configuration_preserves_existing_smtp_settings(self):
        self.assertEqual(smtp.smtp_environment(), {})

    def test_sync_is_idempotent_and_deploy_requires_starttls(self):
        self.assertTrue(smtp.store(json.dumps(self.credentials)))
        self.assertFalse(smtp.store(json.dumps(self.credentials)))
        if os.name == "posix":
            self.assertEqual(stat.S_IMODE(self.config.stat().st_mode), 0o600)
        settings = smtp.smtp_environment()
        self.assertEqual(settings["SMTP_HOST"], "smtp-relay.brevo.com")
        self.assertEqual(settings["SMTP_PORT"], "587")
        self.assertEqual(settings["SMTP_AUTH"], "true")
        self.assertEqual(settings["SMTP_STARTTLS"], "true")
        self.assertEqual(settings["SMTP_PASSWORD"], "test-key")
        self.assertEqual(settings["SMTP_FROM"], "clinic@example.test")

    def test_invalid_secret_does_not_overwrite_existing_configuration(self):
        smtp.store(json.dumps(self.credentials))
        with self.assertRaisesRegex(ValueError, "Invalid SMTP configuration"):
            smtp.store(json.dumps(self.credentials | {"password": "invalid\nvalue"}))
        self.assertEqual(smtp.smtp_environment()["SMTP_PASSWORD"], "test-key")
