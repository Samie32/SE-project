/**
 * Kịch bản kiểm thử tải chuẩn theo NFR-01:
 *   - 50 người dùng đồng thời (VUS=50), duy trì 15 phút (HOLD=15m)
 *   - Kết hợp luồng đọc (GET /api/slots) và luồng ghi (POST /api/appointments kèm Idempotency-Key)
 *   - Ngưỡng đạt: p95 <= 2000 ms (chưa gồm độ trễ dịch vụ ngoài)
 *
 * Ví dụ chạy:
 *   k6 run -e BASE_URL=http://localhost:8080 -e ACCESS_TOKEN=<jwt> -e APPOINTMENT_DATE=2026-12-01 \
 *     -e VUS=50 -e HOLD=15m tests/k6/nfr01-full-load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN = __ENV.ACCESS_TOKEN || '';
const DATE = __ENV.APPOINTMENT_DATE || '';
const VUS = Number(__ENV.VUS || 50);
const WRITE_RATIO = Number(__ENV.WRITE_RATIO || 0.2);

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '1m', target: VUS },
    { duration: __ENV.HOLD || '15m', target: VUS },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    'http_req_duration{endpoint:slots}': ['p(95)<2000'],
    'http_req_duration{endpoint:book}': ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!TOKEN) throw new Error('ACCESS_TOKEN is required (dedicated test PATIENT account).');
  if (!DATE) throw new Error('APPOINTMENT_DATE is required (YYYY-MM-DD).');
  return {};
}

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
  };

  const readRes = http.get(`${BASE_URL}/api/slots?date=${encodeURIComponent(DATE)}`, {
    headers,
    tags: { endpoint: 'slots' },
  });
  check(readRes, {
    'GET /api/slots returns 200': (r) => r.status === 200,
    'GET /api/slots returns JSON': (r) => (r.headers['Content-Type'] || '').includes('json'),
  });

  if (Math.random() < WRITE_RATIO && readRes.status === 200) {
    let slots = [];
    try {
      const body = readRes.json();
      slots = Array.isArray(body) ? body : (body.items || []);
    } catch (_) {
      slots = [];
    }
    if (slots.length > 0) {
      const pick = slots[Math.floor(Math.random() * slots.length)];
      const idemKey = `nfr01-${__VU}-${__ITER}-${Date.now()}`;
      const writeRes = http.post(
        `${BASE_URL}/api/appointments`,
        JSON.stringify({ slotId: pick.id }),
        {
          headers: Object.assign({}, headers, {
            'Content-Type': 'application/json',
            'Idempotency-Key': idemKey,
          }),
          tags: { endpoint: 'book' },
        },
      );
      check(writeRes, {
        'POST /api/appointments returns 201 or expected 409 contention': (r) =>
          r.status === 201 || r.status === 409,
      });
    }
  }

  sleep(1);
}
