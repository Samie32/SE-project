import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const SLOT_ID = __ENV.SLOT_ID;
const TOKENS = [__ENV.PATIENT_TOKEN_A, __ENV.PATIENT_TOKEN_B].filter(Boolean);
const REQUESTS = Number(__ENV.RACE_REQUESTS || 100);
const winners = new Counter('booking_winners');
const conflicts = new Counter('booking_conflicts');
const expectedRaceStatus = http.expectedStatuses(200, 201, 409);

export const options = {
  scenarios: {
    same_slot_race: {
      executor: 'per-vu-iterations',
      vus: REQUESTS,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    checks: ['rate==1'],
    booking_winners: ['count==1'],
    booking_conflicts: [`count==${REQUESTS - 1}`],
  },
};

export function setup() {
  if (!SLOT_ID) throw new Error('SLOT_ID is required and must identify one unused test slot.');
  if (new Set(TOKENS).size !== 2) throw new Error('Two distinct test patient tokens are required.');
  if (!Number.isInteger(REQUESTS) || REQUESTS < 2) throw new Error('RACE_REQUESTS must be an integer >= 2.');
  return { startedAt: Date.now() };
}

export default function ({ startedAt }) {
  const token = TOKENS[(__VU - 1) % 2];
  const response = http.post(
    `${BASE_URL}/api/appointments`,
    JSON.stringify({ slotId: SLOT_ID }),
    {
      responseCallback: expectedRaceStatus,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `k6-contention-${startedAt}-${__VU}-${__ITER}`,
      },
    },
  );
  winners.add(Number(response.status === 200 || response.status === 201));
  conflicts.add(Number(response.status === 409));
  check(response, {
    'race result is success or conflict': (r) => [200, 201, 409].includes(r.status),
  });
}

export function teardown() {
  const appointments = TOKENS.map((token) => http.get(`${BASE_URL}/api/appointments?limit=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  }));
  if (!check(appointments, { 'both patient histories are readable': (rows) => rows.every((r) => r.status === 200) })) return;
  const confirmed = appointments.flatMap((r) => r.json())
    .filter((appointment) => appointment.slotId === SLOT_ID && appointment.status === 'CONFIRMED');
  check(confirmed, { 'the raced slot has exactly one confirmed appointment': (rows) => rows.length === 1 });
}

export function handleSummary(data) {
  const won = data.metrics.booking_winners?.values?.count || 0;
  const lost = data.metrics.booking_conflicts?.values?.count || 0;
  return {
    stdout: `Booking contention winners=${won}; conflicts=${lost}.\n`,
    ...(__ENV.SUMMARY_PATH ? { [__ENV.SUMMARY_PATH]: JSON.stringify(data, null, 2) } : {}),
  };
}
