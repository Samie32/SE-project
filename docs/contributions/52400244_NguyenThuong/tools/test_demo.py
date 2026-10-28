"""Bộ unittest của fixtures, không phải coverage backend."""
import unittest, copy
from datetime import timedelta
from validate_demo import load_data, validate, time_utc


class FixtureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.base=load_data()
    def d(self):return copy.deepcopy(self.base)
    def fail_has(self, data, fragment):
        errs=validate(data)
        self.assertTrue(any(fragment in x for x in errs),f'Không tìm thấy {fragment!r} trong {errs}')
    def test_base_is_consistent(self):self.assertEqual(validate(self.d()),[])
    def test_wrong_mode_is_rejected(self):
        d=self.d();d['slots'][0]['mode']='DIRECT';self.fail_has(d,'mode sai OpenAPI')
    def test_broken_patient_reference_is_rejected(self):
        d=self.d();d['appointments'][0]['patient_id']='missing';self.fail_has(d,'patient_id không trỏ')
    def test_slot_outside_availability_is_rejected(self):
        d=self.d();d['slots'][0]['start_at']='2026-11-09T03:00:00Z';self.fail_has(d,'ngoài availability')
    def test_appointment_snapshot_mismatch(self):
        d=self.d();d['appointments'][0]['mode']='TELEHEALTH';self.fail_has(d,'không khớp Slot')
    def test_appointment_overlap_rejected(self):
        d=self.d();x=d['appointments'][0];y=copy.deepcopy(x);y['id']='4a121918-a154-4c0e-90fe-d67bfbcd0220';y['key']='APT_DUP';d['appointments'].append(y);self.fail_has(d,'Appointment overlap')
    def test_prescription_without_item_rejected(self):
        d=self.d();d['prescription-items']=[];self.fail_has(d,'ISSUED nhưng không có item')
    def test_prescription_item_missing_field_rejected(self):
        d=self.d();del d['prescription-items'][0]['duration_text'];self.fail_has(d,'thiếu duration_text')
    def test_notification_stale_version_rejected(self):
        d=self.d();d['notification-jobs'][0]['appointment_version']=42;self.fail_has(d,'version khác appointment')
    def test_notification_not_minus_30_rejected(self):
        d=self.d();d['notification-jobs'][0]['due_at']='2026-11-10T02:00:00Z';self.fail_has(d,'không nhắc trước 30 phút')
    def test_queue_wrong_doctor_rejected(self):
        d=self.d();d['queue-tickets'][0]['doctor_id']=d['doctors'][1]['id'];self.fail_has(d,'khác doctor')
    def test_encounter_missing_appointment(self):
        d=self.d();d['encounters'][0]['appointment_id']='bad';self.fail_has(d,'appointment_id không trỏ')
    def test_telehealth_requires_remote(self):
        d=self.d();d['telehealth-sessions'][0]['appointment_id']=d['appointments'][2]['id'];self.fail_has(d,'appointment sai')
    def test_utc_must_be_explicit(self):
        with self.assertRaises(ValueError):time_utc('2026-11-10T09:00:00')
    def test_no_password_in_users(self):
        d=self.d();d['users'][0]['password']='fake-password';self.fail_has(d,'mật khẩu/token')

# Test bổ sung cho công cụ dịch ngày; các test runtime của dự án vẫn chưa thực thi.
from datetime import date
from rebase_demo_dates import rebase

class RebaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.data=load_data()
    def test_shift_future_dates_and_keep_past_history(self):
        shifted,slots,apts=rebase(self.data,date(2026,11,17))
        self.assertEqual(validate(shifted),[])
        self.assertEqual(len(slots),9)
        self.assertEqual(len(apts),2)
        self.assertEqual(shifted['encounters'],self.data['encounters'])
        self.assertEqual(shifted['prescriptions'],self.data['prescriptions'])
        self.assertNotEqual(shifted['notification-jobs'][0]['due_at'],self.data['notification-jobs'][0]['due_at'])
    def test_reject_weekend_overrun(self):
        with self.assertRaises(ValueError):rebase(self.data,date(2026,11,21))

class AuditEvidenceTests(unittest.TestCase):
    def test_read_record_audit_fixture_exists(self):
        d=self.base if hasattr(self, 'base') else load_data()
        read=[x for x in d['audit-events'] if x['action']=='READ_MEDICAL_RECORD' and x['result']=='SUCCESS']
        self.assertTrue(read,'Cần audit READ thành công cho TC-12/TC-17')
        records={x['id']:x for x in d['medical-records']}
        self.assertTrue(all(x['resource_id'] in records for x in read))
    def test_missing_read_audit_detected(self):
        d=copy.deepcopy(load_data())
        d['audit-events']=[x for x in d['audit-events'] if x['action']!='READ_MEDICAL_RECORD']
        self.assertTrue(any('READ_MEDICAL_RECORD' in s for s in validate(d)))

if __name__=='__main__':unittest.main()
