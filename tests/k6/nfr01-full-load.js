/**
 * Kịch bản kiểm thử tải chuẩn theo NFR-01:
 *   - 50 người dùng đồng thời (VUS=50), duy trì 15 phút (HOLD=15m)
 *   - Kết hợp luồng đọc (GET /api/slots) và luồng ghi (POST /api/appointments + hủy để giữ slot mở)
 *   - Ngưỡng đạt: p95 <= 2000 ms (chưa gồm độ trễ dịch vụ ngoài)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses(200, 201, 409));

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const SINGLE_TOKEN = __ENV.ACCESS_TOKEN || '';
const TOKENS = __ENV.TOKENS_FILE ? JSON.parse(open(__ENV.TOKENS_FILE)) : (SINGLE_TOKEN ? [SINGLE_TOKEN] : []);
const DATE = __ENV.APPOINTMENT_DATE || '';
const VUS = Number(__ENV.VUS || 50);
const WRITE_RATIO = Number(__ENV.WRITE_RATIO || 0.25);

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '1m', target: VUS },
    { duration: __ENV.HOLD || '15m', target: VUS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    'http_req_duration{endpoint:slots}': ['p(95)<2000'],
    'http_req_duration{endpoint:book}': ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (TOKENS.length === 0) throw new Error('TOKENS_FILE or ACCESS_TOKEN is required.');
  if (!DATE) throw new Error('APPOINTMENT_DATE is required (YYYY-MM-DD).');
  return {};
}

export default function () {
  const token = TOKENS[(__VU - 1) % TOKENS.length];
  const headers = {
    Authorization: `Bearer ${token}`,
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
      const idemBook = `nfr01-book-${__VU}-${__ITER}-${Date.now()}`;
      const writeRes = http.post(
        `${BASE_URL}/api/appointments`,
        JSON.stringify({ slotId: pick.id }),
        {
          headers: Object.assign({}, headers, {
            'Content-Type': 'application/json',
            'Idempotency-Key': idemBook,
          }),
          tags: { endpoint: 'book' },
        },
      );
      check(writeRes, {
        'POST /api/appointments returns 200/201 or expected 409 contention': (r) =>
          r.status === 200 || r.status === 201 || r.status === 409,
      });

      if (writeRes.status === 200 || writeRes.status === 201) {
        try {
          const created = writeRes.json();
          if (created && created.id) {
            const idemCancel = `nfr01-cancel-${__VU}-${__ITER}-${Date.now()}`;
            http.post(
              `${BASE_URL}/api/appointments/${created.id}/cancel`,
              JSON.stringify({ reason: 'NFR-01 load test cleanup', version: created.version ?? 0 }),
              {
                headers: Object.assign({}, headers, {
                  'Content-Type': 'application/json',
                  'Idempotency-Key': idemCancel,
                }),
                tags: { endpoint: 'cancel' },
              },
            );
          }
        } catch (_) {
          // ignore cleanup parse errors
        }
      }
    }
  }

  sleep(1);
}
