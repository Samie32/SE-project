"""Payload regressions for the frozen integration boundary; no HTTP calls."""
import importlib.util
from pathlib import Path
import unittest

_path = Path(__file__).resolve().parents[2] / 'scripts' / 'check-api-contract.py'
_module = importlib.util.spec_from_file_location('contract_check', _path)
contract = importlib.util.module_from_spec(_module)
_module.loader.exec_module(contract)


class IntegrationPayloadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = contract.yaml.safe_load((contract.ROOT/'docs/api/openapi.yaml').read_text(encoding='utf-8'))

    def valid(self, schema, payload):
        return not contract.schema_errors(self.spec, {'$ref':f'#/components/schemas/{schema}'}, payload)

    def test_join_requires_consent_not_legacy_field(self):
        self.assertTrue(self.valid('Join', {'consent':True}))
        self.assertFalse(self.valid('Join', {'participationConfirmed':True}))

    def test_ticket_skip_requires_resource_version(self):
        self.assertTrue(self.valid('Skip', {'reason':'Chưa có mặt', 'version':1}))
        self.assertFalse(self.valid('Skip', {'reason':'Chưa có mặt'}))
        self.assertFalse(self.valid('Skip', {'reason':'   ', 'version':1}))

    def test_progress_rejects_status_alias_and_unknown_transition(self):
        self.assertTrue(self.valid('Progress', {'targetStatus':'IN_PROGRESS', 'version':1}))
        self.assertFalse(self.valid('Progress', {'status':'IN_PROGRESS', 'version':1}))
        self.assertFalse(self.valid('Progress', {'targetStatus':'CONFIRMED', 'version':1}))

    def test_record_initial_version_and_opaque_content(self):
        self.assertTrue(self.valid('RecordInput', {'version':0,'content':'Bản nháp','status':'DRAFT'}))
        self.assertFalse(self.valid('RecordInput', {'version':-1,'content':'Bản nháp','status':'DRAFT'}))
        self.assertFalse(self.valid('RecordInput', {'version':0,'content':{},'status':'DRAFT'}))

    def test_prescription_needs_all_five_fields_and_draft_can_be_empty(self):
        self.assertTrue(self.valid('PrescriptionInput', {'items':[]}))
        item = dict(self.spec['components']['schemas']['PrescriptionItem']['example'])
        self.assertTrue(self.valid('PrescriptionInput', {'items':[item]}))
        del item['durationText']
        self.assertFalse(self.valid('PrescriptionInput', {'items':[item]}))

    def test_audit_uses_created_at_and_allows_system_actor(self):
        event = dict(self.spec['components']['schemas']['AuditEvent']['example'])
        self.assertTrue(self.valid('AuditEvent', event))
        event['timestamp'] = event.pop('createdAt')
        self.assertFalse(self.valid('AuditEvent', event))

    def test_signaling_url_has_single_api_prefix(self):
        token = dict(self.spec['components']['schemas']['JoinToken']['example'])
        self.assertTrue(self.valid('JoinToken', token))
        token['signalingUrl'] = '/api' + token['signalingUrl']
        self.assertFalse(self.valid('JoinToken', token))


if __name__ == '__main__':
    unittest.main()
