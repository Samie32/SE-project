#!/usr/bin/env python3
"""Harness for NFR-01 full load test (50 VUs, 10,000 simulated appointments, 15m).

Subcommands:
  jwks-server : Runs a local ephemeral RSA JWKS server and mints distinct PATIENT JWTs.
  seed        : Generates and loads 10,000 simulated appointments + open future slots into MySQL.
  report      : Converts k6 --summary-export JSON into a Markdown report for CI/report artifacts.
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from pathlib import Path
import subprocess
import sys
import time
import uuid


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def run_jwks_server(args: argparse.Namespace) -> int:
    from cryptography.hazmat.primitives.asymmetric import rsa
    import jwt

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub_numbers = private_key.public_key().public_numbers()
    kid = "nfr01-load-key"
    jwk = {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": kid,
        "n": _b64url(pub_numbers.n.to_bytes((pub_numbers.n.bit_length() + 7) // 8, "big")),
        "e": _b64url(pub_numbers.e.to_bytes((pub_numbers.e.bit_length() + 7) // 8, "big")),
    }
    jwks_bytes = json.dumps({"keys": [jwk]}).encode("utf-8")

    now = int(time.time())
    tokens: list[str] = []
    for i in range(1, args.count + 1):
        sub = f"nfr01-patient-{i:04d}"
        payload = {
            "iss": args.issuer,
            "sub": sub,
            "aud": args.audience,
            "iat": now - 10,
            "exp": now + 7200,
            "preferred_username": sub,
            "name": f"NFR01 Patient {i:04d}",
            "email": f"{sub}@example.test",
        }
        token = jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": kid})
        tokens.append(token)

    out_path = Path(args.tokens_out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(tokens, indent=2), encoding="utf-8")

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path in ("/jwks", "/.well-known/jwks.json"):
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(jwks_bytes)
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *a):
            pass

    server = HTTPServer(("127.0.0.1", args.port), Handler)
    print(f"JWKS server listening on http://127.0.0.1:{args.port}/jwks with {len(tokens)} tokens", flush=True)
    server.serve_forever()
    return 0


def generate_seed_sql(
    *,
    issuer: str,
    appointments: int,
    patients: int,
    doctors: int,
    target_date: str,
) -> str:
    spec_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "nfr01-specialty"))
    lines = [
        "SET autocommit=0;",
        "SET unique_checks=0;",
        f"INSERT IGNORE INTO specialty(id,name,active) VALUES('{spec_id}','NFR01 Load General',TRUE);",
    ]

    doc_ids: list[str] = []
    for d in range(1, doctors + 1):
        uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-doc-user-{d}"))
        did = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-doc-{d}"))
        doc_ids.append(did)
        lines.append(
            f"INSERT IGNORE INTO user_account(id,issuer,subject,display_name,username,staff,active) "
            f"VALUES('{uid}','{issuer}','nfr01-doctor-{d:04d}','NFR01 Doctor {d:02d}','nfr01doc{d:02d}',TRUE,TRUE);"
        )
        lines.append(f"INSERT IGNORE INTO user_role(user_id,role) VALUES('{uid}','DOCTOR');")
        lines.append(f"INSERT IGNORE INTO doctor(id,user_id,active) VALUES('{did}','{uid}',TRUE);")
        lines.append(f"INSERT IGNORE INTO doctor_specialty(doctor_id,specialty_id) VALUES('{did}','{spec_id}');")

    pat_ids: list[str] = []
    for p in range(1, patients + 1):
        uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-pat-user-{p}"))
        pid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-pat-{p}"))
        pat_ids.append(pid)
        sub = f"nfr01-patient-{p:04d}"
        lines.append(
            f"INSERT IGNORE INTO user_account(id,issuer,subject,display_name,username,staff,active) "
            f"VALUES('{uid}','{issuer}','{sub}','NFR01 Patient {p:04d}','{sub}',FALSE,TRUE);"
        )
        lines.append(f"INSERT IGNORE INTO user_role(user_id,role) VALUES('{uid}','PATIENT');")
        lines.append(f"INSERT IGNORE INTO patient(id,user_id) VALUES('{pid}','{uid}');")

    # Seed `appointments` historical COMPLETED appointments + slots across past days
    base_past = datetime(2025, 1, 1, 1, 0, 0, tzinfo=timezone.utc)
    hist_avail_ids: list[str] = []
    for d_idx, did in enumerate(doc_ids):
        aid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-hist-avail-{d_idx}"))
        hist_avail_ids.append(aid)
        lines.append(
            f"INSERT IGNORE INTO availability(id,doctor_id,start_at,end_at,slot_minutes,mode) "
            f"VALUES('{aid}','{did}','2025-01-01 01:00:00.000000','2025-12-31 10:00:00.000000',20,'IN_PERSON');"
        )

    batch_slots: list[str] = []
    batch_appts: list[str] = []
    for idx in range(appointments):
        d_idx = idx % doctors
        slot_seq = idx // doctors
        start_dt = base_past + timedelta(minutes=20 * slot_seq)
        end_dt = start_dt + timedelta(minutes=20)
        start_s = start_dt.strftime("%Y-%m-%d %H:%M:%S.000000")
        end_s = end_dt.strftime("%Y-%m-%d %H:%M:%S.000000")
        sid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-hist-slot-{idx}"))
        apid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-hist-appt-{idx}"))
        did = doc_ids[d_idx]
        aid = hist_avail_ids[d_idx]
        pid = pat_ids[idx % patients]
        batch_slots.append(f"('{sid}','{aid}','{did}','{start_s}','{end_s}','IN_PERSON')")
        batch_appts.append(f"('{apid}','{pid}','{did}','{sid}','{start_s}','{end_s}','IN_PERSON','COMPLETED',0)")
        if len(batch_slots) >= 500:
            lines.append(
                "INSERT IGNORE INTO slot(id,availability_id,doctor_id,start_at,end_at,mode) VALUES "
                + ",".join(batch_slots) + ";"
            )
            lines.append(
                "INSERT IGNORE INTO appointment(id,patient_id,doctor_id,slot_id,start_at,end_at,mode,status,version) VALUES "
                + ",".join(batch_appts) + ";"
            )
            batch_slots.clear()
            batch_appts.clear()
    if batch_slots:
        lines.append(
            "INSERT IGNORE INTO slot(id,availability_id,doctor_id,start_at,end_at,mode) VALUES "
            + ",".join(batch_slots) + ";"
        )
        lines.append(
            "INSERT IGNORE INTO appointment(id,patient_id,doctor_id,slot_id,start_at,end_at,mode,status,version) VALUES "
            + ",".join(batch_appts) + ";"
        )

    # Seed open future bookable slots on target_date (VN 08:00..16:00 = UTC 01:00..09:00 -> 24 slots/doctor)
    target_dt = datetime.strptime(target_date, "%Y-%m-%d").replace(hour=1, minute=0, tzinfo=timezone.utc)
    future_slots: list[str] = []
    for d_idx, did in enumerate(doc_ids):
        aid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-fut-avail-{target_date}-{d_idx}"))
        avail_start = target_dt.strftime("%Y-%m-%d %H:%M:%S.000000")
        avail_end = (target_dt + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S.000000")
        lines.append(
            f"INSERT IGNORE INTO availability(id,doctor_id,start_at,end_at,slot_minutes,mode) "
            f"VALUES('{aid}','{did}','{avail_start}','{avail_end}',20,'IN_PERSON');"
        )
        for s in range(24):
            s_start = (target_dt + timedelta(minutes=20 * s)).strftime("%Y-%m-%d %H:%M:%S.000000")
            s_end = (target_dt + timedelta(minutes=20 * (s + 1))).strftime("%Y-%m-%d %H:%M:%S.000000")
            sid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"nfr01-fut-slot-{target_date}-{d_idx}-{s}"))
            future_slots.append(f"('{sid}','{aid}','{did}','{s_start}','{s_end}','IN_PERSON')")
    lines.append(
        "INSERT IGNORE INTO slot(id,availability_id,doctor_id,start_at,end_at,mode) VALUES "
        + ",".join(future_slots) + ";"
    )
    lines.append("SET unique_checks=1;")
    lines.append("COMMIT;")
    lines.append("ANALYZE TABLE slot, appointment, time_off, doctor, user_account, user_role;")
    return "\n".join(lines) + "\n"


def run_seed(args: argparse.Namespace) -> int:
    sql = generate_seed_sql(
        issuer=args.issuer,
        appointments=args.appointments,
        patients=args.patients,
        doctors=args.doctors,
        target_date=args.target_date,
    )
    cmd = [
        "mysql",
        f"-h{args.host}",
        f"-P{args.port}",
        f"-u{args.user}",
        f"-p{args.password}",
        args.db,
    ]
    subprocess.run(cmd, input=sql.encode("utf-8"), check=True)
    count = subprocess.check_output(
        cmd + ["-N", "-B", "-e", "SELECT COUNT(*) FROM appointment;"],
        text=True,
    ).strip()
    print(f"Seeded NFR-01 dataset complete. Total appointments in DB: {count}", flush=True)
    return 0


def render_report(summary: dict, *, vus: int, hold: str, seeded_appointments: int) -> str:
    metrics = summary.get("metrics", {})

    def val(metric: str, key: str) -> float | None:
        m = metrics.get(metric, {})
        if isinstance(m.get("values"), dict) and key in m["values"]:
            return m["values"].get(key)
        return m.get(key)

    total_reqs = int(val("http_reqs", "count") or 0)
    p50 = val("http_req_duration", "med")
    p95 = val("http_req_duration", "p(95)")
    p99 = val("http_req_duration", "p(99)")
    slots_p95 = val("http_req_duration{endpoint:slots}", "p(95)")
    book_p95 = val("http_req_duration{endpoint:book}", "p(95)")
    checks_rate = val("checks", "rate")
    if checks_rate is None:
        passes = val("checks", "passes")
        fails = val("checks", "fails")
        if isinstance(passes, (int, float)) and isinstance(fails, (int, float)) and (passes + fails) > 0:
            checks_rate = passes / (passes + fails)

    def fmt_ms(v: float | None) -> str:
        return f"{v:.2f} ms" if isinstance(v, (int, float)) else "N/A"

    verdict = "PASS" if (p95 is not None and p95 < 2000.0 and (checks_rate or 0.0) >= 0.99) else "FAIL"
    lines = [
        "## NFR-01 Load Test Report (k6)",
        "",
        f"- **Verdict:** **{verdict}** (threshold: `p95 <= 2000 ms`, `checks >= 99%`)",
        f"- **Load profile:** `{vus} VUs`, hold `{hold}`, dataset `>= {seeded_appointments}` appointments",
        f"- **Total HTTP requests:** `{total_reqs}`",
        "",
        "| Metric | Measured Value | NFR-01 Threshold |",
        "|---|---|---|",
        f"| Overall `p50` | `{fmt_ms(p50)}` | — |",
        f"| Overall `p95` | `{fmt_ms(p95)}` | `<= 2000 ms` |",
        f"| Overall `p99` | `{fmt_ms(p99)}` | — |",
        f"| `GET /api/slots` `p95` | `{fmt_ms(slots_p95)}` | `<= 2000 ms` |",
        f"| `POST /api/appointments` `p95` | `{fmt_ms(book_p95)}` | `<= 2000 ms` |",
        f"| Check pass rate | `{(checks_rate or 0.0) * 100:.2f}%` | `>= 99.00%` |",
        "",
    ]
    return "\n".join(lines)


def run_report(args: argparse.Namespace) -> int:
    summary = json.loads(Path(args.summary_json).read_text(encoding="utf-8"))
    md = render_report(
        summary,
        vus=args.vus,
        hold=args.hold,
        seeded_appointments=args.appointments,
    )
    print(md)
    if args.out_md:
        out = Path(args.out_md)
        out.parent.mkdir(parents=True, exist_ok=True)
        with out.open("a", encoding="utf-8") as handle:
            handle.write(md)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ClinicCare NFR-01 load-test harness")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_jwks = sub.add_parser("jwks-server")
    p_jwks.add_argument("--port", type=int, default=8199)
    p_jwks.add_argument("--issuer", default="http://127.0.0.1:8199")
    p_jwks.add_argument("--audience", default="clinic-api")
    p_jwks.add_argument("--tokens-out", required=True)
    p_jwks.add_argument("--count", type=int, default=50)
    p_jwks.set_defaults(func=run_jwks_server)

    p_seed = sub.add_parser("seed")
    p_seed.add_argument("--host", default="127.0.0.1")
    p_seed.add_argument("--port", type=int, default=3306)
    p_seed.add_argument("--user", default="root")
    p_seed.add_argument("--password", required=True)
    p_seed.add_argument("--db", default="clinic")
    p_seed.add_argument("--issuer", default="http://127.0.0.1:8199")
    p_seed.add_argument("--appointments", type=int, default=10000)
    p_seed.add_argument("--patients", type=int, default=50)
    p_seed.add_argument("--doctors", type=int, default=10)
    p_seed.add_argument("--target-date", required=True)
    p_seed.set_defaults(func=run_seed)

    p_rep = sub.add_parser("report")
    p_rep.add_argument("--summary-json", required=True)
    p_rep.add_argument("--out-md")
    p_rep.add_argument("--vus", type=int, default=50)
    p_rep.add_argument("--hold", default="15m")
    p_rep.add_argument("--appointments", type=int, default=10000)
    p_rep.set_defaults(func=run_report)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
