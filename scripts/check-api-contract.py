"""Validate the normative contract, examples and its request surface against runtime.

Read-only: never exports controller snapshots over the normative YAML.
This is static validation, not HTTP/MySQL or acceptance testing.
"""
from pathlib import Path
import json
import sys

try:
    import yaml
    from jsonschema import Draft202012Validator, FormatChecker
    from openapi_spec_validator import validate_spec
except ImportError as exc:
    raise SystemExit(
        'Install dependencies: python -m pip install -r scripts/requirements-api-contract.txt'
    ) from exc

ROOT = Path(__file__).resolve().parents[1]
METHODS = {'get', 'post', 'put', 'patch', 'delete'}


def operations(spec, runtime=False):
    return {(method, path.removeprefix('/api') if runtime else path): operation
            for path, item in spec['paths'].items()
            for method, operation in item.items() if method in METHODS}


def schema_errors(spec, schema, instance):
    document = {'$schema': 'https://json-schema.org/draft/2020-12/schema',
                'components': spec['components'], 'value': schema, '$ref': '#/value'}
    return list(Draft202012Validator(document, format_checker=FormatChecker()).iter_errors(instance))


def check(spec, runtime):
    errors = []
    try:
        validate_spec(spec)
    except Exception as exc:
        errors.append(f'OpenAPI validation: {exc}')
        return errors, 0
    expected, baseline = operations(spec), operations(runtime, runtime=True)
    if expected.keys() != baseline.keys():
        errors.append(f'Method/path drift: missing={sorted(baseline.keys()-expected.keys())}; '
                      f'extra={sorted(expected.keys()-baseline.keys())}')
    ids = [op['operationId'] for op in expected.values()]
    if len(ids) != len(set(ids)):
        errors.append('Duplicate operationId')
    if spec.get('security') != [{'bearerAuth': []}]:
        errors.append('Global bearer authentication is required')
    covered = set()
    for key, op in expected.items():
        covered.update(op.get('x-requirements', []))
        if not op.get('x-access'):
            errors.append(f'{key}: missing access policy')
        current = baseline.get(key)
        if not current:
            continue
        params = {(p['in'], p['name']): p for p in op.get('parameters', [])}
        current_params = {(p['in'], p['name']): p for p in current.get('parameters', [])}
        if params.keys() != current_params.keys():
            errors.append(f'{key}: parameter names differ from controller snapshot')
        for name, p in current_params.items():
            if p.get('required') and not params.get(name, {}).get('required'):
                errors.append(f'{key}: dropped required parameter {name}')
        for name in ('Idempotency-Key', 'X-Room-Token'):
            if ('header', name) in current_params and not params.get(('header', name), {}).get('required'):
                errors.append(f'{key}: {name} must stay required')
        body = op.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema')
        current_body = current.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema')
        if body != current_body:
            errors.append(f'{key}: body schema reference differs from snapshot')
        if body and '$ref' in body and current_body:
            name = body['$ref'].split('/')[-1]
            target_schema = spec['components']['schemas'][name]
            current_schema = runtime['components']['schemas'][name]
            if target_schema.get('properties', {}).keys() != current_schema.get('properties', {}).keys():
                errors.append(f'{key}: request field names differ from controller')
            if not set(current_schema.get('required', [])).issubset(target_schema.get('required', [])):
                errors.append(f'{key}: dropped required request fields')
        for status, response in op['responses'].items():
            if not status.startswith('2'):
                continue
            if status == '204' or key in {('put','/me/contact'), ('put','/users/{id}/roles'), ('put','/staff/{id}')}:
                if 'content' in response:
                    errors.append(f'{key}/{status}: empty response must not promise JSON')
            elif not response.get('content', {}).get('application/json', {}).get('schema'):
                errors.append(f'{key}/{status}: success response needs a typed schema')
        if key == ('post','/doctors/{id}/queue/next') and '204' not in op['responses']:
            errors.append('Queue next must document an empty 204 response')
    if covered != {f'FR-{i:02d}' for i in range(1,28)}:
        errors.append('FR traceability does not cover exactly FR-01 through FR-27')
    samples = 0
    for name, schema in spec['components']['schemas'].items():
        try:
            Draft202012Validator.check_schema(schema)
        except Exception as exc:
            errors.append(f'{name}: invalid JSON schema: {exc}')
        if 'example' in schema:
            samples += 1
            for err in schema_errors(spec, {'$ref':f'#/components/schemas/{name}'}, schema['example']):
                errors.append(f'{name} example: {err.message}')
    return errors, samples


def main():
    spec = yaml.safe_load((ROOT/'docs/api/openapi.yaml').read_text(encoding='utf-8'))
    runtime = json.loads((ROOT/'docs/api/openapi.json').read_text(encoding='utf-8'))
    errors, samples = check(spec, runtime)
    if errors:
        print('FAIL: API contract')
        print('\n'.join(f'- {e}' for e in errors))
        return 1
    print(f'PASS: OpenAPI {spec["openapi"]}, contract {spec["info"]["version"]}; '
          f'{len(operations(spec))} operations / {len(spec["paths"])} paths; '
          f'{len(spec["components"]["schemas"])} schemas; {samples} valid examples.')
    print('PASS: controller request names, required headers, typed success responses, FR-01..27.')
    print('NOTE: static check only. Runtime acceptance requires integration tests.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
