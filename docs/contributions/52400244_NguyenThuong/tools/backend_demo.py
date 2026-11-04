"""Sinh request backend tuần 3–4. Không nạp fixtures, gửi HTTP hay lưu secrets."""
import argparse
import hashlib
import json
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import uuid4

BASE = Path(__file__).resolve().parent.parent
PROFILE = BASE / 'test-data' / 'backend'
VN = timezone(timedelta(hours=7))
DOCTOR = '20000000-0000-0000-0000-000000000001'
SPECIALTY = '10000000-0000-0000-0000-000000000001'
PATIENT = '00000000-0000-0000-0000-000000000003'
SAMPLE_SLOT = '30000000-0000-0000-0000-000000000001'
SAMPLE_APPOINTMENT = '40000000-0000-0000-0000-000000000001'
ROLES = {'PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMINISTRATOR', 'AUDITOR'}


def snapshot_digest(path):
    # Git autocrlf thay LF/CRLF khi checkout; hash nội dung UTF-8 với LF chuẩn.
    normalized = Path(path).read_text(encoding='utf-8').encode('utf-8')
    return hashlib.sha256(normalized).hexdigest()


def next_day(now):
    if now.utcoffset() is None:
        raise ValueError('Clock phải có múi giờ')
    day = now.astimezone(VN).date() + timedelta(days=1)
    while day.weekday() == 6:
        day += timedelta(days=1)
    return day


def build_bundle(day, now):
    if now.utcoffset() is None or day <= now.astimezone(VN).date() or day.weekday() == 6:
        raise ValueError('Chọn ngày tương lai, thứ Hai–thứ Bảy theo UTC+7')

    def stamp(hour):
        return datetime.combine(day, time(hour), VN).astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

    operations = []

    def add(name, method, path, actor='admin', body=None, params=None, headers=None):
        row = {'name': name, 'method': method, 'path': path, 'actor': actor,
               'params': params or {}, 'headers': headers or {}, 'expected_status': 200}
        if body is not None:
            row['body'] = body
        operations.append(row)

    doctor_path = {'path': {'id': DOCTOR}}
    appointment_path = {'path': {'id': SAMPLE_APPOINTMENT}}
    add('me', 'GET', '/api/me', 'patient')
    add('contact', 'PUT', '/api/me/contact', 'patient', {'email': 'patient@example.test'})
    add('setRoles', 'PUT', '/api/users/{id}/roles', body={'roles': ['PATIENT', 'RECEPTIONIST']},
        params={'path': {'id': '00000000-0000-0000-0000-000000000004'}})
    add('specialties', 'GET', '/api/specialties', 'patient')
    add('createSpecialty', 'POST', '/api/specialties', body={'name': 'Demo 52400244 ' + str(uuid4())})
    add('doctors', 'GET', '/api/doctors', 'patient')
    # userId phải lấy từ /me của một account IdP mới, chưa có doctor profile.
    add('createDoctor', 'POST', '/api/doctors', body={
        'userId': '00000000-0000-0000-0000-000000000007', 'specialtyIds': [SPECIALTY]})
    add('updateDoctor', 'PUT', '/api/doctors/{id}', body={
        'active': True, 'displayName': 'Doctor Demo', 'specialtyIds': [SPECIALTY]}, params=doctor_path)
    add('availabilityList', 'GET', '/api/doctors/{id}/availability', params=doctor_path)
    add('availability', 'POST', '/api/doctors/{id}/availability', body={
        'startAt': stamp(13), 'endAt': stamp(14), 'slotMinutes': 20, 'mode': 'IN_PERSON'}, params=doctor_path)
    add('remoteAvailability', 'POST', '/api/doctors/{id}/availability', body={
        'startAt': stamp(14), 'endAt': stamp(15), 'slotMinutes': 20, 'mode': 'REMOTE'}, params=doctor_path)
    add('timeOffList', 'GET', '/api/doctors/{id}/time-off', params=doctor_path)
    add('timeOff', 'POST', '/api/doctors/{id}/time-off', body={
        'startAt': stamp(16), 'endAt': stamp(17)}, params=doctor_path)
    add('slots', 'GET', '/api/slots', 'patient', params={'query': {
        'date': day.isoformat(), 'doctorId': DOCTOR, 'mode': 'IN_PERSON'}})
    add('appointments', 'GET', '/api/appointments', 'patient', params={'query': {'limit': 20, 'offset': 0}})
    add('book', 'POST', '/api/appointments', 'patient', {'slotId': SAMPLE_SLOT},
        headers={'Idempotency-Key': str(uuid4())})
    add('reschedule', 'POST', '/api/appointments/{id}/reschedule', 'patient',
        {'slotId': SAMPLE_SLOT, 'version': 0}, appointment_path, {'Idempotency-Key': str(uuid4())})
    add('cancel', 'POST', '/api/appointments/{id}/cancel', 'patient',
        {'reason': 'Demo 52400244 completed', 'version': 1}, appointment_path, {'Idempotency-Key': str(uuid4())})
    add('notifications', 'GET', '/api/notification-jobs')
    return {'backend_commit': 'b10e0960a6a48225b5c26af60c737dbd1c37968f',
            'date': day.isoformat(), 'operations': operations,
            'note': 'Schema examples only; sample slot/appointment/new-user UUIDs are NOT seeded IDs.'}


def validate_bundle(bundle, spec_path=None):
    from jsonschema import Draft202012Validator, FormatChecker

    spec = json.loads(Path(spec_path or PROFILE / 'openapi.snapshot.json').read_text(encoding='utf-8'))
    ops = {(m.upper(), p): op for p, methods in spec['paths'].items()
           for m, op in methods.items() if m in ('get', 'post', 'put', 'patch', 'delete')}
    errors, seen = [], set()
    for row in bundle['operations']:
        key = (row['method'], row['path'])
        if key not in ops:
            errors.append(f'Endpoint chưa triển khai: {key}')
            continue
        seen.add(key)
        op = ops[key]
        for param in op.get('parameters', []):
            values = row['headers'] if param['in'] == 'header' else row['params'].get(param['in'], {})
            value = values.get(param['name'])
            if param.get('required') and (value is None or value == ''):
                errors.append(f'{row["name"]}: thiếu {param["in"]}/{param["name"]}')
            if value is not None:
                errors.extend(f'{row["name"]}: {e.message}' for e in
                              Draft202012Validator(param.get('schema', {}), format_checker=FormatChecker()).iter_errors(value))
        request = op.get('requestBody')
        if bool(request) != ('body' in row):
            errors.append(f'{row["name"]}: body không khớp contract')
            continue
        if request:
            schema = request['content']['application/json']['schema']
            if '$ref' in schema:
                schema = spec['components']['schemas'][schema['$ref'].split('/')[-1]]
            # Spring có thể bỏ qua field dư: chủ động chặn để tránh gửi nhầm patientId/mode_label.
            schema = dict(schema, additionalProperties=False)
            errors.extend(f'{row["name"]}: {e.message}' for e in
                          Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(row['body']))
            body = row['body']
            if 'roles' in body and not set(body['roles']) <= ROLES:
                errors.append(f'{row["name"]}: role sai backend')
            for field in ('reason', 'name', 'displayName', 'email'):
                if field in body and isinstance(body[field], str) and not body[field].strip():
                    errors.append(f'{row["name"]}: {field} không được trống')
            if 'mode' in body and body['mode'] not in {'IN_PERSON', 'REMOTE'}:
                errors.append(f'{row["name"]}: mode sai backend')
    errors.extend(f'Thiếu operation: {m} {p}' for m, p in sorted(set(ops) - seen))
    return errors


def render_http(bundle):
    rows = {r['name']: r for r in bundle['operations']}
    lines = [
        '# VS Code REST Client: chạy từng request theo thứ tự trong môi trường local demo.',
        '# Kiểm /me, /doctors, /specialties trước: ID phải khớp accounts.json.',
        '# Cần ít nhất 2 slot IN_PERSON trống; version/ID lấy từ response.',
        '# Nếu POST availability trả 409 khi chạy lại, kiểm GET availability trước khi bỏ qua.',
        '@baseUrl = http://localhost:8080',
        '@adminToken = {{$processEnv CLINIC_ADMIN_TOKEN}}',
        '@patientToken = {{$processEnv CLINIC_PATIENT_TOKEN}}',
    ]

    def emit(name, method, url, actor='patient', body=None, key=None):
        lines.extend(['', '###', '# @name ' + name, f'{method} {{{{baseUrl}}}}{url}',
                      f'Authorization: Bearer {{{{{actor}Token}}}}'])
        if key:
            lines.append('Idempotency-Key: ' + key)
        if body is not None:
            lines.extend(['Content-Type: application/json', '', body])

    emit('me', 'GET', '/api/me')
    emit('doctors', 'GET', '/api/doctors')
    emit('specialties', 'GET', '/api/specialties')
    emit('availabilityList', 'GET', f'/api/doctors/{DOCTOR}/availability', 'admin')
    emit('availability', 'POST', f'/api/doctors/{DOCTOR}/availability', 'admin',
         json.dumps(rows['availability']['body'], indent=2))
    emit('remoteAvailability', 'POST', f'/api/doctors/{DOCTOR}/availability', 'admin',
         json.dumps(rows['remoteAvailability']['body'], indent=2))
    emit('slots', 'GET', f'/api/slots?date={bundle["date"]}&doctorId={DOCTOR}&mode=IN_PERSON')
    booking = '{"slotId":"{{slots.response.body.$[0].id}}"}'
    emit('book', 'POST', '/api/appointments', body=booking, key=rows['book']['headers']['Idempotency-Key'])
    emit('bookReplay', 'POST', '/api/appointments', body=booking, key=rows['book']['headers']['Idempotency-Key'])
    emit('reschedule', 'POST', '/api/appointments/{{book.response.body.$.id}}/reschedule',
         body='{"slotId":"{{slots.response.body.$[1].id}}","version":{{book.response.body.$.version}}}',
         key=rows['reschedule']['headers']['Idempotency-Key'])
    emit('cancel', 'POST', '/api/appointments/{{book.response.body.$.id}}/cancel',
         body='{"reason":"Demo 52400244 completed","version":{{reschedule.response.body.$.version}}}',
         key=rows['cancel']['headers']['Idempotency-Key'])
    emit('appointments', 'GET', '/api/appointments?limit=20&offset=0')
    emit('notifications', 'GET', '/api/notification-jobs', 'admin')
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', type=date.fromisoformat, help='Ngày tương lai YYYY-MM-DD theo UTC+7')
    parser.add_argument('--check', action='store_true', help='Chỉ kiểm tra; không sinh file')
    parser.add_argument('--spec', type=Path, help='Đối chiếu thêm OpenAPI JSON backend khác')
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    bundle = build_bundle(args.date or next_day(now), now)
    metadata = json.loads((PROFILE / 'source.json').read_text(encoding='utf-8'))
    digest = snapshot_digest(PROFILE / 'openapi.snapshot.json')
    if digest != metadata['snapshot_sha256']:
        raise ValueError('Snapshot bị thay đổi, cần cập nhật source.json sau khi đối chiếu backend')
    errors = validate_bundle(bundle, args.spec)
    if errors:
        print('\n'.join(errors))
        return 1
    print('PASS: backend request schemas/parameters, 19 operations. NOT a live API/MySQL test.')
    if not args.check:
        output = BASE / 'test-data' / 'generated' / ('backend-' + bundle['date'])
        output.mkdir(parents=True, exist_ok=True)
        (output / 'requests.json').write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (output / 'demo.http').write_text(render_http(bundle), encoding='utf-8')
        print('Generated:', output)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
