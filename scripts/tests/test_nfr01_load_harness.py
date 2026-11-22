import importlib.util
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("nfr01_load_harness", ROOT / "scripts/nfr01-load-harness.py")
MOD = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MOD
SPEC.loader.exec_module(MOD)


class Nfr01LoadHarnessTests(unittest.TestCase):
    def test_generate_seed_sql_contains_expected_entities_and_batches(self):
        sql = MOD.generate_seed_sql(
            issuer="http://127.0.0.1:8199",
            appointments=1000,
            patients=50,
            doctors=10,
            target_date="2026-12-01",
        )
        self.assertIn("INSERT IGNORE INTO specialty", sql)
        self.assertEqual(sql.count("nfr01-doctor-"), 10)
        self.assertEqual(sql.count("nfr01-patient-"), 100)  # subject + username per patient
        self.assertEqual(sql.count("'COMPLETED',0"), 1000)
        self.assertIn("2026-12-01 01:00:00.000000", sql)

    def test_render_report_marks_pass_when_p95_below_2000ms(self):
        summary = {
            "metrics": {
                "http_reqs": {"values": {"count": 45000}},
                "http_req_duration": {"values": {"med": 12.5, "p(95)": 85.4, "p(99)": 140.2}},
                "http_req_duration{endpoint:slots}": {"values": {"p(95)": 42.1}},
                "http_req_duration{endpoint:book}": {"values": {"p(95)": 95.8}},
                "checks": {"values": {"rate": 0.999}},
            }
        }
        md = MOD.render_report(summary, vus=50, hold="15m", seeded_appointments=10000)
        self.assertIn("**PASS**", md)
        self.assertIn("85.40 ms", md)
        self.assertIn("45000", md)

    def test_render_report_marks_fail_when_p95_exceeds_threshold(self):
        summary = {
            "metrics": {
                "http_reqs": {"values": {"count": 100}},
                "http_req_duration": {"values": {"med": 500.0, "p(95)": 2500.0, "p(99)": 3100.0}},
                "checks": {"values": {"rate": 1.0}},
            }
        }
        md = MOD.render_report(summary, vus=50, hold="15m", seeded_appointments=10000)
        self.assertIn("**FAIL**", md)

    def test_render_report_supports_flat_k6_summary_export_format(self):
        summary = {
            "metrics": {
                "http_reqs": {"count": 52000, "rate": 52.0},
                "http_req_duration": {"med": 14.2, "p(95)": 68.5, "p(99)": 120.0},
                "http_req_duration{endpoint:slots}": {"p(95)": 55.1},
                "http_req_duration{endpoint:book}": {"p(95)": 88.4},
                "checks": {"passes": 1000, "fails": 0, "value": 1.0},
            }
        }
        md = MOD.render_report(summary, vus=50, hold="15m", seeded_appointments=10000)
        self.assertIn("**PASS**", md)
        self.assertIn("68.50 ms", md)
        self.assertIn("52000", md)
        self.assertIn("100.00%", md)
