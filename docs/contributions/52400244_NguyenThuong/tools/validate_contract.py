"""Kiểm tra 100% operationId OpenAPI có ví dụ metadata, body và tham số bắt buộc.
Không khởi tạo HTTP, DB, hay khẳng định kết quả runtime.
"""
from pathlib import Path
import json
try:
    import yaml
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:
    raise SystemExit('Thiếu dependency: python -m pip install -r docs/contributions/52400244_NguyenThuong/tools/requirements-contract.txt')
ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent.parent
SPEC=ROOT/'docs/api/openapi.yaml'
CATALOG=BASE/'test-data/scenarios/api-catalog.json'
EX=BASE/'test-data/api-examples'

def main():
    source=yaml.safe_load(SPEC.read_text(encoding='utf-8'))
    if source.get('openapi')!='3.1.0':raise ValueError('Expected OpenAPI 3.1.0')
    catalog=json.loads(CATALOG.read_text(encoding='utf-8'))
    ops={(meth.upper(),path):info for path,methods in source['paths'].items() for meth,info in methods.items() if meth.lower() in ('get','post','put','patch','delete')}
    errors=[]; seen=set(); used=set()
    schemas=source['components']['schemas']
    def validate_json(instance,schema):
        document={'$schema':'https://json-schema.org/draft/2020-12/schema','components':{'schemas':schemas},'$ref':'#/local'}
        document['local']=schema
        return list(Draft202012Validator(document,format_checker=FormatChecker()).iter_errors(instance))
    def resolve_ref(sch):
        if '$ref' in sch: return schemas[sch['$ref'].split('/')[-1]]
        return sch
    for row in catalog['operations']:
        k=(row['method'],row['path']); seen.add(k)
        if k not in ops:
            errors.append(f'{k}: không có operation trong OpenAPI');continue
        entry=ops[k]; op=row['operation_id']
        if entry['operationId']!=op:errors.append(f'{op}: operationId không trùng')
        for prm in entry.get('parameters',[]):
            if prm.get('required') and prm['name'] not in row.get('params',{}).get(prm['in'],{}):
                errors.append(f'{op}: thiếu tham số bắt buộc {prm["in"]}/{prm["name"]}')
        request=entry.get('requestBody')
        filename=row.get('body_file')
        if bool(request)!=bool(filename):
            errors.append(f'{op}: body không khớp yêu cầu của OpenAPI');continue
        if filename:
            used.add(filename)
            try: body=json.loads((EX/filename).read_text(encoding='utf-8'))
            except (OSError,ValueError) as ex:errors.append(f'{op}: {ex}');continue
            schema=request['content']['application/json']['schema']
            errs=validate_json(body,schema)
            if errs:errors.append(f'{op}: body {filename}: '+ '; '.join(e.message for e in errs))
    missing=set(ops)-seen
    if missing:errors.append('Thiếu operation: '+', '.join(f'{m} {p}' for m,p in sorted(missing)))
    if len(seen)!=len(catalog['operations']):errors.append('Có operation bị lặp trong catalog')
    for negative in catalog.get('negative_request_bodies',[]):
        op=negative['operation_id']; entries=[i for i in ops.values() if i['operationId']==op]
        if len(entries)!=1 or not entries[0].get('requestBody'):errors.append(f'{op}: không resolve requestBody');continue
        filename=negative['body_file'];used.add(filename)
        try: body=json.loads((EX/filename).read_text(encoding='utf-8'))
        except (OSError,ValueError) as e:errors.append(f'{filename}: {e}');continue
        actual_valid=not validate_json(body,entries[0]['requestBody']['content']['application/json']['schema'])
        if actual_valid != negative['schema_valid']:errors.append(f'{filename}: expected schema_valid={negative["schema_valid"]}, actual={actual_valid}')
    extra={x.name for x in EX.glob('*.json')}-used
    if extra:errors.append('File JSON chưa kiểm: '+', '.join(sorted(extra)))
    if errors:
        print('FAIL: '+str(len(errors))+' lỗi contract catalog');print('\n'.join(' - '+e for e in errors));return 1
    print(f'PASS: {len(ops)}/{len(ops)} OpenAPI operations có ví dụ metadata; {len(used)} request bodies được kiểm schema (gồm negative examples).')
    print('NOTE: schema-valid != business-valid. Chưa kiểm thử HTTP, phân quyền, side effects hay MySQL.')
    return 0
if __name__=='__main__':raise SystemExit(main())
