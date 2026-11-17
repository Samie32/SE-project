import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const SLOT_ID = __ENV.SLOT_ID;
const TOKENS = [__ENV.PATIENT_TOKEN_A, __ENV.PATIENT_TOKEN_B].filter(Boolean);

export const options = {
  scenarios: {
    same_slot_race: {
      executor: 'per-vu-iterations',
      vus: 2,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    checks: ['rate==1'],
  },
};

export function setup() {
  if (!SLOT_ID) throw new Error('SLOT_ID is required and must identify one unused test slot.');
  if (TOKENS.length !== 2) throw new Error('PATIENT_TOKEN_A and PATIENT_TOKEN_B are required.');
  return { startedAt: Date.now() };
}

export default function () {
  const token = TOKENS[(__VU - 1) % 2];
  const response = http.post(
    `${BASE_URL}/api/appointments`,
    JSON.stringify({ slotId: SLOT_ID }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `k6-contention-${__VU}-${__ITER}-${Date.now()}`,
      },
    },
  );
  check(response, {
    'race result is success or conflict': (r) => [200, 201, 409].includes(r.status),
  });
}

export function handleSummary(data) {
  const count = data.metrics.http_reqs?.values?.count || 0;
  const failures = data.metrics.http_req_failed?.values?.passes || 0;
  return {
    stdout: `Contention requests=${count}; failed HTTP requests=${failures}.\n`,
  };
}
