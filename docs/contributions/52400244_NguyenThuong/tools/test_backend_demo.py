"""Regression cho bộ request backend; không gọi API thật."""
import copy
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import patch

import backend_demo as demo


class BackendDemoTests(unittest.TestCase):
    NOW = datetime(2026, 11, 4, 10, tzinfo=timezone.utc)

    def bundle(self):
        return demo.build_bundle(date(2026, 11, 10), self.NOW)

    def test_snapshot_hash_survives_git_autocrlf_checkout(self):
        with tempfile.TemporaryDirectory() as folder:
            lf, crlf = Path(folder) / 'lf.json', Path(folder) / 'crlf.json'
            lf.write_bytes(b'{\n  "openapi": "3.1.0"\n}\n')
            crlf.write_bytes(lf.read_bytes().replace(b'\n', b'\r\n'))
            self.assertEqual(demo.snapshot_digest(lf), demo.snapshot_digest(crlf))

    def test_next_day_uses_vietnam_date_and_skips_sunday(self):
        # 18:00Z thứ Sáu = 01:00 thứ Bảy VN; ngày kế tiếp hợp lệ là thứ Hai.
        self.assertEqual(demo.next_day(datetime(2026, 11, 6, 18, tzinfo=timezone.utc)), date(2026, 11, 9))

    def test_reject_sunday_past_and_naive_clock(self):
        for day in (date(2026, 11, 8), date(2026, 11, 4), date(2026, 11, 3)):
            with self.subTest(day=day), self.assertRaises(ValueError):
                demo.build_bundle(day, self.NOW)
        with self.assertRaises(ValueError):
            demo.next_day(datetime(2026, 11, 4))

    def test_payload_uses_runtime_names_modes_and_zero_version(self):
        rows = {r['name']: r for r in self.bundle()['operations']}
        self.assertEqual(rows['availability']['body'], {
            'startAt': '2026-11-10T06:00:00Z', 'endAt': '2026-11-10T07:00:00Z',
            'slotMinutes': 20, 'mode': 'IN_PERSON'})
        self.assertEqual(rows['remoteAvailability']['body']['mode'], 'REMOTE')
        self.assertEqual(rows['reschedule']['body']['version'], 0)
        self.assertEqual(rows['setRoles']['body']['roles'], ['PATIENT', 'RECEPTIONIST'])

    def test_contract_covers_every_implemented_operation(self):
        self.assertEqual(demo.validate_bundle(self.bundle()), [])

    def run_check(self, bundle, spec=None):
        args = ['backend_demo.py', '--check']
        if spec is not None:
            args.extend(['--spec', str(spec)])
        output = io.StringIO()
        with patch('sys.argv', args), patch.object(demo, 'build_bundle', return_value=bundle), redirect_stdout(output):
            result = demo.main()
        return result, output.getvalue()

    def test_check_reports_contract_coverage_and_example_counts(self):
        result, output = self.run_check(self.bundle())
        self.assertEqual(result, 0)
        self.assertIn('18/18 operations covered; 19 request examples', output)
        self.assertIn('NOT a live API/MySQL test', output)

    def test_removing_duplicate_example_preserves_operation_coverage(self):
        bundle = self.bundle()
        bundle['operations'] = [r for r in bundle['operations'] if r['name'] != 'remoteAvailability']
        self.assertEqual(demo.validate_bundle(bundle), [])
        result, output = self.run_check(bundle)
        self.assertEqual(result, 0)
        self.assertIn('18/18 operations covered; 18 request examples', output)

    def test_missing_operation_never_reports_pass(self):
        bundle = self.bundle()
        bundle['operations'] = [r for r in bundle['operations'] if r['name'] != 'contact']
        result, output = self.run_check(bundle)
        self.assertEqual(result, 1)
        self.assertIn('PUT /api/me/contact', output)
        self.assertNotIn('PASS:', output)

    def test_selected_contract_addition_requires_example_and_updates_count(self):
        spec = json.loads((demo.PROFILE / 'openapi.snapshot.json').read_text(encoding='utf-8'))
        spec['paths']['/api/review-placeholder'] = {'get': {'responses': {'200': {'description': 'test'}}}}
        with tempfile.TemporaryDirectory() as folder:
            spec_path = Path(folder) / 'openapi.json'
            spec_path.write_text(json.dumps(spec), encoding='utf-8')
            result, output = self.run_check(self.bundle(), spec_path)
            self.assertEqual(result, 1)
            self.assertIn('GET /api/review-placeholder', output)
            self.assertNotIn('PASS:', output)
            bundle = copy.deepcopy(self.bundle())
            bundle['operations'].append({'name': 'newOperation', 'method': 'GET',
                'path': '/api/review-placeholder', 'params': {}, 'headers': {}})
            result, output = self.run_check(bundle, spec_path)
            self.assertEqual(result, 0)
            self.assertIn('19/19 operations covered; 20 request examples', output)

    def test_contract_detects_old_field_enum_role_and_missing_header(self):
        for name, mutate in (
            ('availability', lambda r: r['body'].update(mode='TELEHEALTH')),
            ('availability', lambda r: r['body'].pop('startAt')),
            ('setRoles', lambda r: r['body'].update(roles=['ADMIN'])),
            ('book', lambda r: r['headers'].pop('Idempotency-Key')),
            ('reschedule', lambda r: r['body'].update(version=-1)),
            ('cancel', lambda r: r['body'].update(reason='   ')),
        ):
            bundle = self.bundle()
            row = next(r for r in bundle['operations'] if r['name'] == name)
            mutate(row)
            with self.subTest(name=name):
                self.assertTrue(demo.validate_bundle(bundle))

    def test_missing_operation_and_unknown_field_are_detected(self):
        bundle = self.bundle()
        bundle['operations'] = [r for r in bundle['operations'] if r['name'] != 'contact']
        self.assertTrue(demo.validate_bundle(bundle))
        bundle = self.bundle()
        next(r for r in bundle['operations'] if r['name'] == 'book')['body']['patientId'] = demo.PATIENT
        self.assertTrue(demo.validate_bundle(bundle))

    def test_http_resolves_server_ids_and_versions(self):
        http = demo.render_http(self.bundle())
        self.assertIn('{{slots.response.body.$[0].id}}', http)
        self.assertIn('{{book.response.body.$.id}}', http)
        self.assertIn('{{book.response.body.$.version}}', http)
        self.assertIn('{{reschedule.response.body.$.version}}', http)
        self.assertIn('{{$processEnv CLINIC_PATIENT_TOKEN}}', http)
        self.assertNotIn('TELEHEALTH', http)
        self.assertNotIn('password', http.lower())
        # Khóa cố định cho replay, nhưng không trùng giữa book/đổi/hủy.
        keys = [line for line in http.splitlines() if line.startswith('Idempotency-Key:')]
        self.assertEqual(len(keys), 4)
        self.assertEqual(keys[0], keys[1])
        self.assertEqual(len(set(keys)), 3)


if __name__ == '__main__':
    unittest.main()
