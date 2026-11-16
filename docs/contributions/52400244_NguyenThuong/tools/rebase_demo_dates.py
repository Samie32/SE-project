"""Dịch CHỈ lịch FUTURE và jobs nhắc sang ngày demo mới; không ghi đè dữ liệu nguồn.

Ví dụ: python tools/rebase_demo_dates.py --base-date 2026-11-17
"""
import argparse, json
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from validate_demo import load_data, validate, time_utc, FOLDER, VN

BASE1=date(2026,11,10)
BASE2=date(2026,11,11)

def shift(value,delta):
    t=time_utc(value)
    return (t+timedelta(days=delta)).isoformat(timespec='seconds').replace('+00:00','Z')

def rebase(dataset, start):
    if start.weekday()>4:raise ValueError('Ngày bắt đầu phải từ thứ Hai đến thứ Sáu để cả hai ngày khám là ngày làm việc')
    updated=json.loads(json.dumps(dataset))
    dates={BASE1:start,BASE2:start+timedelta(days=1)}
    slots_to_shift=set(); apts_to_shift=set()
    for row in updated['availabilities']:
        orig=time_utc(row['start_at']).astimezone(VN).date()
        if orig in dates:
            delta=(dates[orig]-orig).days
            for f in ('start_at','end_at'):row[f]=shift(row[f],delta)
            aid=row['id']
            for sl in updated['slots']:
                if sl['availability_id']==aid:
                    for f in ('start_at','end_at'):sl[f]=shift(sl[f],delta)
                    slots_to_shift.add(sl['id'])
                    for ap in updated['appointments']:
                        if ap['slot_id']==sl['id']:
                            for f in ('start_at','end_at'):ap[f]=shift(ap[f],delta)
                            apts_to_shift.add(ap['id'])
                            for job in updated['notification-jobs']:
                                if job['appointment_id']==ap['id']:job['due_at']=shift(job['due_at'],delta)
    errors=validate(updated)
    if errors:raise ValueError('Dữ liệu sau dịch ngày không hợp lệ: '+'; '.join(errors))
    return updated,slots_to_shift,apts_to_shift

def main():
    parser=argparse.ArgumentParser(description='Dịch lịch demo tương lai sang ngày mới (giờ Việt Nam)')
    mx=parser.add_mutually_exclusive_group(required=True)
    mx.add_argument('--base-date',help='YYYY-MM-DD, thứ Hai đến thứ Sáu; hai ngày khám từ base-date')
    mx.add_argument('--auto-next-business-day',action='store_true',help='Tự chọn ngày thứ Hai–thứ Sáu đầu tiên sau hôm nay tại Việt Nam')
    parser.add_argument('--output-dir',help='Thư mục chứa fixtures/ api-examples/ mới; không ghi đè fixture gốc')
    args=parser.parse_args()
    today=datetime.now(VN).date()
    if args.auto_next_business_day:
        start=today+timedelta(days=1)
        while start.weekday()>4:start+=timedelta(days=1)
    else:
        start=date.fromisoformat(args.base_date)
    if start<=today:raise SystemExit(f'Ngày demo phải sau hôm nay tại VN ({today}); lịch quá khứ không được tạo lại cho luồng đặt lịch')
    out=Path(args.output_dir) if args.output_dir else FOLDER/'test-data/generated'/start.isoformat()
    original=FOLDER/'test-data/fixtures'
    if out.resolve()==original.resolve():raise SystemExit('Không ghi đè dữ liệu nguồn')
    if out.exists():raise SystemExit('Thư mục đích đã tồn tại; chọn thư mục khác để tránh ghi đè')
    data,sl,ap=rebase(load_data(),start)
    (out/'fixtures').mkdir(parents=True)
    (out/'api-examples').mkdir(parents=True)
    for name,items in data.items():
        (out/'fixtures'/f'{name}.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Bản sao api-catalog được cập nhật ngày truy vấn nhưng không sửa catalog nguồn.
    catalog=FOLDER/'test-data/scenarios/api-catalog.json'
    if catalog.exists():
        manifest=json.loads(catalog.read_text(encoding='utf-8'))
        for op in manifest['operations']:
            if op['operation_id']=='listSlots' and 'date' in op.get('params',{}).get('query',{}):
                op['params']['query']['date']=start.isoformat()
        (out/'scenarios').mkdir(parents=True,exist_ok=True)
        (out/'scenarios'/'api-catalog.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for inp in (FOLDER/'test-data/api-examples').glob('*.json'):
        body=json.loads(inp.read_text(encoding='utf-8'))
        if inp.name in ('create_availability.json','create_time_off.json'):
            delta=(start-BASE1).days
            for field in ('startAt','endAt'):body[field]=shift(body[field],delta)
        (out/'api-examples'/inp.name).write_text(json.dumps(body,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (out/'README.txt').write_text('DATA GENERATED FOR DEMO ONLY – không seed production, cần xác nhận backend/migration.\n',encoding='utf-8')
    print(f'PASS: {out}\nĐã dịch ngày {len(sl)} slot, {len(ap)} appointments, các job liên quan; giữ lịch sử không đổi.')
    print('CẢNH BÁO: check-in / telehealth phụ thuộc thời điểm hiện tại; cần đồng hồ thử nghiệm/tạo lịch gần giờ và kiểm tra quyền thực tế.')

if __name__=='__main__':main()
