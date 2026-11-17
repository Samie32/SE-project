import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN = __ENV.ACCESS_TOKEN || '';
const DATE = __ENV.APPOINTMENT_DATE || '';

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '30s', target: Number(__ENV.VUS || 10) },
    { duration: __ENV.HOLD || '2m', target: Number(__ENV.VUS || 10) },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!TOKEN) throw new Error('ACCESS_TOKEN is required. Use a dedicated test account.');
  if (!DATE) throw new Error('APPOINTMENT_DATE is required (YYYY-MM-DD).');
  return {};
}

export default function () {
  const response = http.get(`${BASE_URL}/api/slots?date=${encodeURIComponent(DATE)}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  });
  check(response, {
    'slot search returns success': (r) => r.status === 200,
    'slot search response is JSON': (r) => (r.headers['Content-Type'] || '').includes('json'),
  });
  sleep(1);
}
