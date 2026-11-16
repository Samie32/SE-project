"""Kiểm tra TĨNH dữ liệu giả lập SE-project – không kết nối database/API."""
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from uuid import UUID
import json, csv, copy

FOLDER = Path(__file__).resolve().parent.parent
FIXTURES = FOLDER / 'test-data' / 'fixtures'
FILES = ('users','patients','doctors','specialties','doctor-specialties','availabilities','slots','appointments','encounters','medical-records','prescriptions','prescription-items','queue-tickets','telehealth-sessions','notification-jobs','audit-events')
ACTIVE = {'CONFIRMED','CHECKED_IN','IN_PROGRESS'}
VALID_MODES = {'IN_PERSON','TELEHEALTH'}
ROLES = {'PATIENT','DOCTOR','RECEPTIONIST','ADMIN','AUDITOR'}
UTC = timezone.utc
VN = ZoneInfo('Asia/Ho_Chi_Minh')


def load_data(path=FIXTURES):
    data={}
    for name in FILES:
        raw=json.loads((Path(path)/(name+'.json')).read_text(encoding='utf-8'))
        if not isinstance(raw,list):raise ValueError(f'{name}: cần JSON array')
        data[name]=raw
    return data


def time_utc(value):
    try:
        d=datetime.fromisoformat(value.replace('Z','+00:00'))
    except (AttributeError,ValueError) as exc:
        raise ValueError(f'Timestamp không đúng ISO-8601: {value}') from exc
    if d.tzinfo is None or d.utcoffset()!=timedelta(0) or not value.endswith('Z'):
        raise ValueError(f'Timestamp không dùng UTC-Z: {value}')
    return d


def validate(data, traceability_path=None):
    errors=[]
    def check(test, message):
        if not test: errors.append(message)
    maps={}
    all_ids=set()
    for name in FILES:
        rows=data.get(name,[])
        check(isinstance(rows,list),f'{name}: không phải list')
        if not isinstance(rows,list):continue
        seen=set()
        for row in rows:
            check(isinstance(row,dict),f'{name}: có bản ghi không phải object')
            if not isinstance(row,dict):continue
            key=row.get('key','')
            check(bool(key),f'{name}: thiếu alias key')
            if key:
                check(key not in seen,f'{name}: alias key trùng {key}')
                seen.add(key)
            if name!='doctor-specialties':
                pk=row.get('id')
                try:
                    UUID(pk)
                    check(pk==str(UUID(pk)),f'{name}: UUID không chuẩn chữ thường {pk}')
                except (TypeError, ValueError, AttributeError):errors.append(f'{name}: ID UUID không hợp lệ {pk}')
                check(pk not in all_ids,f'UUID trùng ở nhiều thực thể: {pk}')
                all_ids.add(pk)
        maps[name]={r.get('id'):r for r in rows if isinstance(r,dict) and 'id' in r}
    def fk(row,col,target,origin):
        check(row.get(col) in maps.get(target,{}),f'{origin}/{row.get("key")}: {col} không trỏ tới {target}')
    u=maps['users']; p=maps['patients']; d=maps['doctors'];av=maps['availabilities']; slots=maps['slots']; a=maps['appointments']; en=maps['encounters'];rx=maps['prescriptions'];rec=maps['medical-records'];q=maps['queue-tickets']
    check(len(data.get('patients',[]))>=2 and len(data.get('doctors',[]))>=2 and len(data.get('specialties',[]))>=2,'Thiếu >=2 BN/BS/CK theo test-plan')
    set_roles=set()
    for x in data['users']:
        set_roles.update(x.get('roles',[]))
        check(set(x.get('roles',[])).issubset(ROLES) and bool(x.get('roles')),f'users/{x["key"]}: role không hợp lệ')
        check(x.get('issuer')=='https://idp.example.invalid','Issuer phải là domain giả .invalid')
        check(bool(x.get('subject')),'Thiếu subject')
        check('password' not in x and 'token' not in x,'Không đặt mật khẩu/token trong fixture')
    check(set_roles == ROLES,'Không đủ đúng 5 vai trò')
    check(len({(x['issuer'],x['subject']) for x in data['users']})==len(data['users']),'issuer+subject trùng')
    for category in ('patients','doctors'):
        for x in data[category]:fk(x,'user_id','users',category)
        check(len({x.get('user_id') for x in data[category]})==len(data[category]),f'{category} user_id trùng')
    for x in data['patients']:
        check('PATIENT' in u.get(x['user_id'],{}).get('roles',[]),f'{x["key"]}: user không có PATIENT')
        check('contact_encrypted' not in x, 'Không tạo dữ liệu BLOB giả cho contact')
    for x in data['doctors']:
        check('DOCTOR' in u.get(x['user_id'],{}).get('roles',[]),f'{x["key"]}: user không có DOCTOR')
    check(len({x['name'].strip().casefold() for x in data['specialties']})==len(data['specialties']),'Tên specialty trùng')
    links=set()
    for x in data['doctor-specialties']:
        fk(x,'doctor_id','doctors','doctor-specialties');fk(x,'specialty_id','specialties','doctor-specialties')
        links.add((x['doctor_id'],x['specialty_id']))
    check(len(links)==len(data['doctor-specialties']),'Quan hệ DoctorSpecialty trùng')
    for x in data['availabilities']:
        fk(x,'doctor_id','doctors','availability')
        check(x.get('mode') in VALID_MODES,f'Availability/{x["key"]}: mode sai OpenAPI')
        try:
            t0,t1=time_utc(x['start_at']),time_utc(x['end_at'])
            check(t0<t1, f'Availability/{x["key"]}: start >= end')
            l0,l1=t0.astimezone(VN),t1.astimezone(VN)
            check(l0.weekday()<6 and l0.date()==l1.date() and l0.hour>=8 and (l1.hour,l1.minute)<=(17,0),f'Availability/{x["key"]}: ngoài giờ làm việc')
            check(isinstance(x.get('slot_minutes'),int) and x['slot_minutes']>0,f'Availability/{x["key"]}: slot_minutes')
        except (KeyError,ValueError,TypeError) as e:errors.append(f'Availability/{x.get("key")}: {e}')
    by_av={}
    for x in data['slots']:
        fk(x,'availability_id','availabilities','slot');fk(x,'doctor_id','doctors','slot')
        if x.get('mode') not in VALID_MODES:errors.append(f'Slot/{x["key"]}: mode sai OpenAPI')
        parent=av.get(x.get('availability_id'))
        try:
            t0,t1=time_utc(x['start_at']),time_utc(x['end_at'])
            check(t0<t1,f'Slot/{x["key"]}: start>=end')
            if parent:
                check(x.get('doctor_id')==parent['doctor_id'] and x.get('mode')==parent['mode'],f'Slot/{x["key"]}: doctor/mode khác availability')
                check(time_utc(parent['start_at'])<=t0 and t1<=time_utc(parent['end_at']),f'Slot/{x["key"]}: ngoài availability')
                check((t1-t0).total_seconds()==parent['slot_minutes']*60,f'Slot/{x["key"]}: duration khác slotMinutes')
            by_av.setdefault(x.get('availability_id'),[]).append((t0,t1))
        except (ValueError,TypeError,KeyError) as e:errors.append(f'Slot/{x.get("key")}: {e}')
    for avail_id,intervals in by_av.items():
        intervals.sort()
        for older,newer in zip(intervals,intervals[1:]):check(older[1]<=newer[0],f'Slot overlap availability {avail_id}')
    for x in data['appointments']:
        for col,targ in [('patient_id','patients'),('doctor_id','doctors'),('slot_id','slots')]:fk(x,col,targ,'appointment')
        s=slots.get(x.get('slot_id'))
        if s:
            for col in ('doctor_id','start_at','end_at','mode'):check(x.get(col)==s.get(col),f'Appointment/{x["key"]}: {col} không khớp Slot')
        check(x.get('status') in ACTIVE|{'CANCELLED','COMPLETED','NO_SHOW'},f'Appointment/{x["key"]}: trạng thái sai')
        check(isinstance(x.get('version'),int) and x['version']>=0,f'Appointment/{x["key"]}: version sai')
    active=[x for x in data['appointments'] if x.get('status') in ACTIVE]
    for i,x in enumerate(active):
        for y in active[i+1:]:
            try:overlap=time_utc(x['start_at'])<time_utc(y['end_at']) and time_utc(x['end_at'])>time_utc(y['start_at'])
            except (KeyError,TypeError,ValueError):continue
            if overlap:check(x['doctor_id']!=y['doctor_id'] and x['patient_id']!=y['patient_id'],f'Appointment overlap {x["key"]} vs {y["key"]}')
    for x in data['encounters']:
        fk(x,'appointment_id','appointments','encounter')
        ap=a.get(x.get('appointment_id'))
        if ap:check(ap['status']=='COMPLETED' and x.get('status')=='COMPLETED',f'Encounter/{x["key"]}: trạng thái không nhất quán')
    check(len({x['appointment_id'] for x in data['encounters']})==len(data['encounters']),'Encounter trùng appointment')
    for x in data['medical-records']:
        fk(x,'encounter_id','encounters','medical-record');fk(x,'author_id','users','medical-record')
        check(x.get('status') in {'DRAFT','FINAL'},f'Record/{x["key"]}: status')
        check(x.get('content_encrypted') is None and x.get('encryption_instruction'),f'Record/{x["key"]}: không giả lập ciphertext đã có')
        if x.get('supersedes_id') is not None:fk(x,'supersedes_id','medical-records','medical-record')
    for x in data['prescriptions']:
        fk(x,'encounter_id','encounters','prescription');fk(x,'author_id','users','prescription')
        check(x.get('status') in {'DRAFT','ISSUED'},f'Prescription/{x["key"]}: status sai')
        its=[it for it in data['prescription-items'] if it.get('prescription_id')==x['id']]
        if x['status']=='ISSUED':
            check(len(its)>=1, f'Prescription/{x["key"]}: ISSUED nhưng không có item')
            try:time_utc(x['issued_at'])
            except (ValueError,TypeError,KeyError):errors.append(f'Prescription/{x["key"]}: thiếu issued_at')
        else:check(x.get('issued_at') is None,f'Prescription/{x["key"]}: DRAFT có issued_at')
    for x in data['prescription-items']:
        fk(x,'prescription_id','prescriptions','prescription-item')
        for col in ('medicine_name','dose_text','route','frequency','duration_text'):
            check(isinstance(x.get(col),str) and bool(x[col].strip()),f'PrescriptionItem/{x["key"]}: thiếu {col}')
        check('GIA_LAP' in x.get('medicine_name',''),f'PrescriptionItem/{x["key"]}: tên thuốc phải giả lập')
    for x in data['queue-tickets']:
        fk(x,'appointment_id','appointments','queue');fk(x,'doctor_id','doctors','queue')
        ap=a.get(x.get('appointment_id'))
        if ap:
            check(ap['mode']=='IN_PERSON' and ap['doctor_id']==x['doctor_id'],f'Queue/{x["key"]}: lịch không trực tiếp/khác doctor')
            check(x['service_date']==time_utc(ap['start_at']).astimezone(VN).date().isoformat(),f'Queue/{x["key"]}: service_date sai VN')
            check(x['status']=='DONE' and ap['status']=='COMPLETED',f'Queue/{x["key"]}: state không nhất quán')
        check(isinstance(x.get('position'),int) and x['position']>0,f'Queue/{x["key"]}: position không dương')
    check(len({(x['doctor_id'],x['service_date'],x['position']) for x in data['queue-tickets']})==len(data['queue-tickets']),'Queue position trùng')
    check(len({x['appointment_id'] for x in data['queue-tickets']})==len(data['queue-tickets']),'Queue trùng appointment')
    for x in data['telehealth-sessions']:
        fk(x,'appointment_id','appointments','telehealth')
        ap=a.get(x.get('appointment_id'))
        if ap:check(ap['mode']=='TELEHEALTH' and ap['status']=='COMPLETED',f'Telehealth/{x["key"]}: appointment sai')
        check(x['status']=='ENDED' and x.get('ended_at'),f'Telehealth/{x["key"]}: phải ENDED với ended_at')
        try:time_utc(x['ended_at'])
        except (TypeError,ValueError,KeyError):errors.append(f'Telehealth/{x["key"]}: ended_at sai')
        check('token' not in x and 'media' not in x,f'Telehealth/{x["key"]}: không lưu token/media')
    check(len({x['appointment_id'] for x in data['telehealth-sessions']})==len(data['telehealth-sessions']),'Telehealth session trùng appointment')
    check(len({x['provider_room_id'] for x in data['telehealth-sessions']})==len(data['telehealth-sessions']),'Provider_room_id trùng')
    for x in data['notification-jobs']:
        fk(x,'appointment_id','appointments','notification')
        ap=a.get(x.get('appointment_id'))
        if ap:
            check(x.get('appointment_version')==ap['version'],f'Notification/{x["key"]}: version khác appointment')
            check(time_utc(x['due_at'])==time_utc(ap['start_at'])-timedelta(minutes=30),f'Notification/{x["key"]}: không nhắc trước 30 phút')
        check(x['status']=='PENDING' and x['attempts']==0 and x['lease_until'] is None and x['provider_message_id'] is None,f'Notification/{x["key"]}: pending fields sai')
    check(len({x['dedupe_key'] for x in data['notification-jobs']})==len(data['notification-jobs']),'Notification dedupe_key trùng')
    # BR-13/16, FR-12/17: fixture phải chứng minh cấu trúc audit READ; không khẳng định backend đã ghi khi request chạy.
    read_audits=[x for x in data['audit-events'] if x.get('action')=='READ_MEDICAL_RECORD' and x.get('result')=='SUCCESS']
    check(bool(read_audits),'Audit: thiếu READ_MEDICAL_RECORD thành công (TC-12/TC-17)')
    check(len({x.get('correlation_id') for x in data['audit-events']})==len(data['audit-events']),'Audit: correlation_id trùng')
    for x in data['audit-events']:
        fk(x,'actor_id','users','audit')
        check(x['actor_type']=='USER' and x['actor_label'] is None,f'Audit/{x["key"]}: actor sai')
        check(x.get('resource_type') in {'MedicalRecord','Prescription'},f'Audit/{x["key"]}: resource_type sai')
        expected_ids=set(rec) if x.get('resource_type')=='MedicalRecord' else set(rx)
        check(x.get('resource_id') in expected_ids,f'Audit/{x["key"]}: resource_id không hợp lệ')
        if x.get('action')=='READ_MEDICAL_RECORD':
            check(x['resource_type']=='MedicalRecord',f'Audit/{x["key"]}: READ phải trỏ MedicalRecord')
            check('DOCTOR' in u.get(x.get('actor_id'),{}).get('roles',[]),f'Audit/{x["key"]}: READ fixture cần bác sĩ')
        check(bool(x.get('action')) and bool(x.get('result')) and bool(x.get('correlation_id')),f'Audit/{x["key"]}: metadata thiếu')
        try:time_utc(x['timestamp'])
        except (TypeError,KeyError,ValueError):errors.append(f'Audit/{x["key"]}: timestamp không hợp lệ')
    if traceability_path is not None:
        with Path(traceability_path).open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
        ids=[x['Test case'] for x in rows]
        check(sorted(ids)==[f'TC-{i:02d}' for i in range(1,25)],'Traceability: thiếu/trùng TC-01..TC-24')
        for x in rows:
            for name in x['Fixtures involved'].split(','):
                check(name.strip() in FILES,f'{x["Test case"]}: unknown fixture {name}')
            check(x.get('Fixture status')!='PASS' and x.get('Fixture status')!='Đã kiểm thử',f'{x["Test case"]}: không được ghi PASS runtime')
    return errors


def main():
    try:
        data=load_data();errors=validate(data,FOLDER/'test-data/scenarios/traceability.csv')
    except (OSError,ValueError,KeyError) as e:
        errors=[str(e)];data={}
    if errors:
        print(f'FAIL: {len(errors)} lỗi tĩnh')
        for i,e in enumerate(errors,1):print(f'  {i:02d}. {e}')
        return 1
    print('PASS: static fixture validation (KHÔNG phải API/MySQL test)')
    print('Groups:',len(FILES),'Records:',sum(len(v) for v in data.values()))
    print('Appointments:',len(data['appointments']),'Prescription:',len(data['prescriptions']),'Items:',len(data['prescription-items']))
    print('Traceability: TC-01..TC-24 được lập kế hoạch; chưa chạy runtime')
    return 0

if __name__=='__main__':raise SystemExit(main())
