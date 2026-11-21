import csv
from datetime import datetime, timedelta, timezone
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("verify_live_demo", ROOT / "scripts/verify-live-demo.py")
MOD = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MOD
SPEC.loader.exec_module(MOD)


class VerifyLiveDemoTests(unittest.TestCase):
    def _healthy_requester(self, url, *, method="GET", data=None, headers=None, timeout=15, follow_redirects=True):
        if url == "https://app.test/":
            return MOD.HttpResponse(
                status=200,
                headers={
                    "Strict-Transport-Security": ["max-age=31536000; includeSubDomains"],
                    "Content-Security-Policy": ["default-src 'self'; object-src 'none'; frame-ancestors 'none'"],
                    "X-Frame-Options": ["DENY"],
                    "X-Content-Type-Options": ["nosniff"],
                    "Referrer-Policy": ["same-origin"],
                },
                body="<html>ClinicCare</html>",
            )
        if url == "https://app.test/api/me/profile":
            return MOD.HttpResponse(status=401, headers={}, body="")
        if url == "https://app.test/api/webrtc/ice":
            return MOD.HttpResponse(status=401, headers={"Cache-Control": ["no-store"]}, body="")
        if url == "https://auth.test/realms/clinic/.well-known/openid-configuration":
            return MOD.HttpResponse(
                status=200,
                headers={
                    "Strict-Transport-Security": ["max-age=31536000"],
                    "X-Content-Type-Options": ["nosniff"],
                },
                body='{"issuer": "https://auth.test/realms/clinic"}',
            )
        if url == "https://auth.test/realms/clinic/protocol/openid-connect/token" and method == "POST":
            return MOD.HttpResponse(status=400, headers={}, body='{"error":"unauthorized_client"}')
        if url.startswith("https://auth.test/realms/clinic/protocol/openid-connect/auth"):
            return MOD.HttpResponse(status=400, headers={}, body="Invalid redirect_uri")
        raise AssertionError(f"Unexpected URL: {url}")

    def _healthy_stun(self, host, *, port=3478, timeout=5):
        return True, f"STUN TCP {host}:{port} -> Binding Success (0x0101, 40B)"

    def test_run_all_checks_passes_when_vm_responses_match_security_baseline(self):
        results = MOD.run_all_checks(
            "https://app.test",
            "https://auth.test",
            requester=self._healthy_requester,
            stun_prober=self._healthy_stun,
        )
        self.assertEqual(len(results), 6)
        self.assertTrue(all(r.passed for r in results), results)
        md = MOD.render_markdown_summary(results, "https://app.test", "https://auth.test")
        self.assertIn("AGENT-TC-009", md)
        self.assertIn("webrtc-stun-turn", md)
        self.assertIn("**PASS**", md)

    def test_security_headers_fails_when_csp_or_hsts_missing(self):
        def broken(url, **kwargs):
            if url == "https://app.test/":
                return MOD.HttpResponse(status=200, headers={}, body="<html></html>")
            return self._healthy_requester(url, **kwargs)

        res = MOD.check_security_headers("https://app.test", "https://auth.test", requester=broken)
        self.assertFalse(res.passed)
        self.assertIn("Strict-Transport-Security", res.detail)
        self.assertIn("CSP", res.detail)

    def test_update_agent_catalog_appends_runs_and_updates_projection(self):
        results = MOD.run_all_checks(
            "https://app.test",
            "https://auth.test",
            requester=self._healthy_requester,
            stun_prober=self._healthy_stun,
        )
        with tempfile.TemporaryDirectory() as tmp:
            catalog = Path(tmp) / "catalog.csv"
            runs = Path(tmp) / "runs.csv"
            catalog.write_text(
                "case_id,last_status,last_run_id\n"
                "AGENT-TC-007,FAIL,RUN-20261121-AGENT-TC-007\n"
                "AGENT-TC-008,PASS,RUN-20261121-AGENT-TC-008\n"
                "AGENT-TC-009,PASS,RUN-20261121-AGENT-TC-009\n",
                encoding="utf-8",
            )
            runs.write_text(
                "run_id,case_id,executed_at,commit,environment,status,actual,evidence_ref,report_ref,notes\n"
                "RUN-20261121-AGENT-TC-009,AGENT-TC-009,2026-11-21,abc1234,demo,PASS,ok,NOT_RETAINED,NOT_RETAINED,init\n",
                encoding="utf-8",
            )
            updated = MOD.update_agent_catalog(
                results,
                catalog_path=catalog,
                runs_path=runs,
                commit="98aa64a",
                environment="Azure demo HTTPS",
                now=datetime(2026, 11, 21, 22, 30, 0, tzinfo=timezone(timedelta(hours=7))),
            )
            self.assertEqual(len(updated), 3)
            with catalog.open("r", encoding="utf-8", newline="") as handle:
                by_id = {r["case_id"]: r for r in csv.DictReader(handle)}
            self.assertEqual(by_id["AGENT-TC-007"]["last_status"], "PASS")
            self.assertEqual(by_id["AGENT-TC-009"]["last_run_id"], "RUN-20261121-AGENT-TC-009-R2")
            with runs.open("r", encoding="utf-8", newline="") as handle:
                run_rows = list(csv.DictReader(handle))
            self.assertEqual(len(run_rows), 4)
            self.assertEqual(run_rows[-1]["commit"], "98aa64a")
