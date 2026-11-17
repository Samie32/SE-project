import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN = __ENV.ACCESS_TOKEN || '';

export const options = {
  vus: Number(__ENV.VUS || 1),
  iterations: Number(__ENV.ITERATIONS || 5),
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

function headers(token = TOKEN) {
  const value = { Accept: 'application/json' };
  if (token) value.Authorization = `Bearer ${token}`;
  return value;
}

export default function () {
  group('security boundary', () => {
    const anonymous = http.get(`${BASE_URL}/api/me`, { headers: headers('') });
    check(anonymous, { 'anonymous request is rejected': (r) => r.status === 401 });

    const invalid = http.get(`${BASE_URL}/api/me`, {
      headers: { Authorization: 'Bearer invalid.token.value' },
    });
    check(invalid, { 'invalid JWT is rejected': (r) => r.status === 401 });
  });

  if (!TOKEN) {
    console.warn('ACCESS_TOKEN not set: authenticated catalog checks are skipped.');
    sleep(1);
    return;
  }

  group('authenticated catalog contract', () => {
    const me = http.get(`${BASE_URL}/api/me`, { headers: headers() });
    check(me, { 'profile returns 200': (r) => r.status === 200 });

    const doctors = http.get(`${BASE_URL}/api/doctors`, { headers: headers() });
    check(doctors, { 'doctor catalog returns 200': (r) => r.status === 200 });

    const specialties = http.get(`${BASE_URL}/api/specialties`, { headers: headers() });
    check(specialties, { 'specialty catalog returns 200': (r) => r.status === 200 });
  });
  sleep(1);
}
