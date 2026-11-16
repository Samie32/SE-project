"""Templates chạy từng bước bằng REST Client; không gửi HTTP trong Python."""
import json
from uuid import uuid4


def header(note, variables):
    return [f'# {note}', '# NOT RUN. Dừng khi lỗi, tải lại trạng thái/version trước khi tiếp tục.',
            '@baseUrl = http://localhost:8080', *variables]


def emit(lines, name, method, path, actor, body=None, command=False, room=False):
    lines.extend(['', '###', '# @name ' + name, f'{method} {{{{baseUrl}}}}/api{path}',
                  f'Authorization: Bearer {{{{{actor}Token}}}}'])
    if command: lines.append('Idempotency-Key: ' + str(uuid4()))
    if room: lines.append('X-Room-Token: {{join.response.body.$.token}}')
    if body is not None: lines.extend(['Content-Type: application/json', '', body])


def render_clinical_http(bundle):
    lines = header('Luồng trực tiếp: lịch IN_PERSON CONFIRMED, check-in trong [T-15,T+15).', [
        '@doctorToken = {{$processEnv CLINIC_DOCTOR_TOKEN}}',
        '@receptionistToken = {{$processEnv CLINIC_RECEPTIONIST_TOKEN}}',
        '@appointmentId = {{$processEnv CLINIC_IN_PERSON_APPOINTMENT_ID}}',
        '# ID phải lấy từ API, không lấy UUID fixtures thiết kế.',
        '# Mỗi request có key riêng; retry giữ nguyên key và body. Khi đổi nội dung phải đổi key.',
        f'@queueDate = {bundle["date"]}', '# Sửa queueDate thành ngày hẹn thực theo UTC+7 trước khi chạy.',
    ])
    emit(lines, 'doctorProfile', 'GET', '/me/profile', 'doctor')
    emit(lines, 'checkIn', 'POST', '/appointments/{{appointmentId}}/check-in', 'receptionist', command=True)
    emit(lines, 'queue', 'GET', '/doctors/{{doctorProfile.response.body.$.doctorId}}/queue?date={{queueDate}}', 'doctor')
    emit(lines, 'callNext', 'POST', '/doctors/{{doctorProfile.response.body.$.doctorId}}/queue/next?date={{queueDate}}', 'doctor', command=True)
    lines.append('# Chỉ tiếp tục nếu callNext.appointmentId chính là appointmentId. Có CALLED/IN_SERVICE khác thì dừng.')
    emit(lines, 'beforeStart', 'GET', '/appointments/{{appointmentId}}', 'doctor')
    emit(lines, 'start', 'POST', '/appointments/{{appointmentId}}/progress', 'doctor',
         '{"targetStatus":"IN_PROGRESS","version":{{beforeStart.response.body.$.version}}}', command=True)
    emit(lines, 'detail', 'GET', '/appointments/{{appointmentId}}', 'doctor')
    lines.append('# Ca mới chưa có record: version=0. Nếu có draft cũ, đọc current trước và dùng version hiện tại.')
    emit(lines, 'draft', 'PUT', '/encounters/{{detail.response.body.$.encounterId}}/record', 'doctor',
         '{"version":0,"content":"DU LIEU DEMO 52400244 - KHONG PHAI BENH AN THAT","status":"DRAFT"}', command=True)
    emit(lines, 'current', 'GET', '/encounters/{{detail.response.body.$.encounterId}}/record', 'doctor')
    emit(lines, 'final', 'PUT', '/encounters/{{detail.response.body.$.encounterId}}/record', 'doctor',
         '{"version":{{current.response.body.$.version}},"content":"DEMO FINAL - KHONG PHAI BENH AN THAT","status":"FINAL"}', command=True)
    item = {'medicineName': 'DEMO KHONG PHAI THUOC', 'doseText': 'Du lieu gia lap',
            'route': 'Du lieu gia lap', 'frequency': 'Du lieu gia lap', 'durationText': 'Du lieu gia lap'}
    emit(lines, 'rx', 'POST', '/encounters/{{detail.response.body.$.encounterId}}/prescriptions', 'doctor',
         json.dumps({'items': [item]}), command=True)
    emit(lines, 'issue', 'POST', '/prescriptions/{{rx.response.body.$.id}}/issue', 'doctor',
         '{"version":{{rx.response.body.$.version}}}', command=True)
    emit(lines, 'beforeComplete', 'GET', '/appointments/{{appointmentId}}', 'doctor')
    emit(lines, 'complete', 'POST', '/appointments/{{appointmentId}}/progress', 'doctor',
         '{"targetStatus":"COMPLETED","version":{{beforeComplete.response.body.$.version}}}', command=True)
    return '\n'.join(lines) + '\n'


def render_telehealth_http(bundle):
    lines = header('Vòng đời REMOTE: chuẩn bị/join trong [T-10,T+15), start trong [T,T+15).', [
        '@patientToken = {{$processEnv CLINIC_PATIENT_TOKEN}}',
        '@doctorToken = {{$processEnv CLINIC_DOCTOR_TOKEN}}',
        '@appointmentId = {{$processEnv CLINIC_REMOTE_APPOINTMENT_ID}}',
        '# Chỉ chạy trên lịch thuộc patient và doctor tương ứng; token phòng không thay JWT.',
        '# Chạy file này để kiểm vòng đời HOẶC để frontend điều khiển; không start/end đồng thời cả hai.',
        '# Request này không chứng minh truyền media. Dùng hai trình duyệt FE để kiểm RTP và TURN.',
    ])
    emit(lines, 'prepare', 'POST', '/appointments/{{appointmentId}}/telehealth-session', 'patient', command=True)
    emit(lines, 'patientJoin', 'POST', '/telehealth-sessions/{{prepare.response.body.$.id}}/join', 'patient', '{"consent":true}')
    emit(lines, 'waiting', 'GET', '/telehealth-sessions/{{prepare.response.body.$.id}}', 'doctor')
    emit(lines, 'start', 'POST', '/telehealth-sessions/{{prepare.response.body.$.id}}/start', 'doctor',
         '{"version":{{waiting.response.body.$.version}}}', command=True)
    emit(lines, 'join', 'POST', '/telehealth-sessions/{{prepare.response.body.$.id}}/join', 'doctor', '{"consent":false}')
    emit(lines, 'signals', 'GET', '/telehealth-sessions/{{prepare.response.body.$.id}}/signals?after=0', 'doctor', room=True)
    lines.append('# Room token hết hạn sau 5 phút; gọi lại join trước expiry rồi dùng response mới.')
    emit(lines, 'current', 'GET', '/telehealth-sessions/{{prepare.response.body.$.id}}', 'doctor')
    emit(lines, 'reconnecting', 'POST', '/telehealth-sessions/{{prepare.response.body.$.id}}/connection', 'doctor',
         '{"version":{{current.response.body.$.version}},"state":"RECONNECTING"}', room=True)
    emit(lines, 'beforeEnd', 'GET', '/telehealth-sessions/{{prepare.response.body.$.id}}', 'doctor')
    emit(lines, 'end', 'POST', '/telehealth-sessions/{{prepare.response.body.$.id}}/end', 'doctor',
         '{"version":{{beforeEnd.response.body.$.version}}}', command=True)
    emit(lines, 'ended', 'GET', '/telehealth-sessions/{{prepare.response.body.$.id}}', 'patient')
    lines.append('# Sau ENDED: join/signals phải bị từ chối. Hoàn tất record FINAL và appointment bằng lệnh riêng.')
    return '\n'.join(lines) + '\n'
