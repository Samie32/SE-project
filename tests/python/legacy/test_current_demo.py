import sys
from pathlib import Path as _Path
sys.path.insert(0, str(_Path(__file__).resolve().parents[3] / 'docs' / 'contributions' / '52400244_NguyenThuong' / 'tools'))
"""Regression bộ demo theo hợp đồng 1.0.0; không gọi HTTP hoặc MySQL."""
import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
from datetime import date, datetime, timezone
import backend_demo as demo


class CurrentDemoTests(unittest.TestCase):
    def bundle(self):
        return demo.build_bundle(date(2030, 1, 8), datetime(2030, 1, 7, tzinfo=timezone.utc))

    def test_current_contract_has_46_operations(self):
        bundle = self.bundle()
        self.assertEqual(len({(r['method'], r['path']) for r in bundle['operations']}), 46)
        self.assertEqual(demo.validate_bundle(bundle), [])

    def test_nested_prescription_and_room_header_are_validated(self):
        for mutate in (
            lambda rows: rows['createPrescription']['body']['items'][0].pop('doseText'),
            lambda rows: rows['pollSignals']['headers'].pop('X-Room-Token'),
            lambda rows: rows['saveRecord']['headers'].pop('Idempotency-Key'),
        ):
            bundle = self.bundle()
            mutate({r['name']: r for r in bundle['operations']})
            self.assertTrue(demo.validate_bundle(bundle))

    def test_profile_queue_and_clinical_use_appropriate_actors(self):
        rows = {r['name']: r for r in self.bundle()['operations']}
        self.assertEqual(rows['checkIn']['actor'], 'receptionist')
        self.assertEqual(rows['saveRecord']['actor'], 'doctor')
        self.assertEqual(rows['listAuditEvents']['actor'], 'auditor')
        self.assertNotIn('X-Room-Token', rows['getSession']['headers'])

    def test_snapshot_matches_normative_contract(self):
        self.assertEqual(demo.validate_source(), [])

    def test_contract_drift_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            changed = Path(folder)/'openapi.yaml'
            changed.write_text(demo.NORMATIVE.read_text(encoding='utf-8')+'\n# changed\n', encoding='utf-8')
            with patch.object(demo, 'NORMATIVE', changed):
                self.assertTrue(demo.validate_source())

    def test_committed_examples_are_current_and_schema_valid(self):
        bundle = json.loads((demo.PROFILE/'request-examples.json').read_text(encoding='utf-8'))
        self.assertEqual(demo.validate_bundle(bundle), [])
        self.assertEqual(len(bundle['operations']), 47)

    def test_unknown_query_and_actor_are_rejected(self):
        for mutate in (
            lambda row: row['params'].setdefault('query', {}).update(fakeFilter='unknown'),
            lambda row: row.update(actor='anonymous'),
        ):
            bundle = self.bundle();mutate(bundle['operations'][0])
            self.assertTrue(demo.validate_bundle(bundle))

    def test_booking_http_does_not_create_duplicate_seed_availability(self):
        http = demo.render_http(self.bundle())
        self.assertNotIn('POST {{baseUrl}}/api/doctors/', http)

    def test_clinical_and_remote_http_chain_server_ids(self):
        bundle = self.bundle()
        clinical = demo.render_clinical_http(bundle)
        remote = demo.render_telehealth_http(bundle)
        self.assertIn('{{detail.response.body.$.encounterId}}', clinical)
        self.assertIn('{{current.response.body.$.version}}', clinical)
        self.assertIn('{{join.response.body.$.token}}', remote)
        self.assertIn('X-Room-Token:', remote)
        self.assertIn('CLINIC_DOCTOR_TOKEN', clinical)
        self.assertNotIn('password', (clinical + remote).lower())


if __name__ == '__main__':
    unittest.main()
