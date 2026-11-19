"""Offline structural checks for the supplemental k6 pack and traceability docs."""
import unittest
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]


class TestPackAssets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = yaml.safe_load((ROOT / 'docs/api/openapi.yaml').read_text(encoding='utf-8'))

    def test_booking_payload_and_idempotency_contract_exist(self):
        operation = self.spec['paths']['/appointments']['post']
        schema = self.spec['components']['schemas']['Booking']
        self.assertIn('Idempotency-Key', [p['name'] for p in operation['parameters']])
        self.assertEqual(['slotId'], schema['required'])

    def test_smoke_script_targets_real_api_routes(self):
        script = (ROOT / 'tests/k6/api-smoke.js').read_text(encoding='utf-8')
        for route in ['/api/me', '/api/doctors', '/api/specialties']:
            self.assertIn(route, script)

    def test_contention_script_requires_two_patient_tokens_and_one_slot(self):
        script = (ROOT / 'tests/k6/appointment-contention.js').read_text(encoding='utf-8')
        for required in ['PATIENT_TOKEN_A', 'PATIENT_TOKEN_B', 'SLOT_ID', "[200, 201, 409]"]:
            self.assertIn(required, script)

    def test_load_script_has_latency_and_error_thresholds(self):
        script = (ROOT / 'tests/k6/appointment-load.js').read_text(encoding='utf-8')
        self.assertIn("p(95)<1200", script)
        self.assertIn("rate<0.01", script)
        self.assertIn('/api/slots?date=', script)

    def test_regression_catalog_references_executable_cases(self):
        report = (ROOT / 'docs/testing/reports/2026-11-19-test-report.md').read_text(encoding='utf-8')
        java = (ROOT / 'backend/src/test/java/com/clinic/SchedulingIntegrationTest.java').read_text(encoding='utf-8')
        rows = [line.split('|') for line in report.splitlines() if line.startswith('| RG-')]
        self.assertTrue(rows, 'Expected RG rows in the regression catalog')
        self.assertEqual(len(rows), len({row[1].strip() for row in rows}))
        for row in rows:
            method = row[4].strip().strip('`')
            self.assertIn(f'void {method}(', java)


if __name__ == '__main__':
    unittest.main()
