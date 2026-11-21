#!/usr/bin/env python3
"""Post-deploy live smoke & security verifier for ClinicCare Azure demo.

Verifies live HTTPS responses from the Azure VM (frontend security headers,
unauthenticated API 401 guard, Keycloak OIDC discovery, Direct Access Grants
blocking, and foreign redirect URI rejection). Optionally writes a Markdown
summary (for GitHub Actions Job Summary) or appends verified runs to the local
agent test catalog/run journal.
"""
from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_APP_URL = "https://cliniccare-demo.duckdns.org"
DEFAULT_AUTH_URL = "https://cliniccare-auth.duckdns.org"
ROOT = Path(__file__).resolve().parents[1]
VN_TZ = timezone(timedelta(hours=7))


@dataclass
class HttpResponse:
    status: int
    headers: dict[str, list[str]]
    body: str

    def header_values(self, name: str) -> list[str]:
        target = name.lower()
        return [v for k, vals in self.headers.items() if k.lower() == target for v in vals]

    def header_joined(self, name: str) -> str:
        return "; ".join(self.header_values(name))


@dataclass
class CheckResult:
    check_id: str
    case_id: str
    passed: bool
    summary: str
    detail: str


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(
    url: str,
    *,
    method: str = "GET",
    data: bytes | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 15,
    follow_redirects: bool = True,
) -> HttpResponse:
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    opener = (
        urllib.request.build_opener()
        if follow_redirects
        else urllib.request.build_opener(_NoRedirect())
    )
    try:
        with opener.open(req, timeout=timeout) as resp:
            raw_headers: dict[str, list[str]] = {}
            for key, value in resp.headers.items():
                raw_headers.setdefault(key, []).append(value)
            body = resp.read().decode("utf-8", errors="replace")
            return HttpResponse(status=resp.status, headers=raw_headers, body=body)
    except urllib.error.HTTPError as err:
        raw_headers = {}
        for key, value in err.headers.items():
            raw_headers.setdefault(key, []).append(value)
        body = err.read().decode("utf-8", errors="replace") if err.fp else ""
        return HttpResponse(status=err.code, headers=raw_headers, body=body)


def check_security_headers(app_url: str, auth_url: str, requester=fetch, timeout: int = 15) -> CheckResult:
    missing: list[str] = []
    fe = requester(f"{app_url.rstrip('/')}/", timeout=timeout)
    if fe.status != 200:
        missing.append(f"frontend status={fe.status} (expected 200)")
    hsts = fe.header_joined("Strict-Transport-Security")
    if "max-age=" not in hsts.lower():
        missing.append("frontend missing Strict-Transport-Security")
    csp = fe.header_joined("Content-Security-Policy")
    if "frame-ancestors 'none'" not in csp or "object-src 'none'" not in csp:
        missing.append("frontend CSP missing frame-ancestors 'none' or object-src 'none'")
    if "DENY" not in fe.header_joined("X-Frame-Options").upper():
        missing.append("frontend missing X-Frame-Options: DENY")
    if "nosniff" not in fe.header_joined("X-Content-Type-Options").lower():
        missing.append("frontend missing X-Content-Type-Options: nosniff")
    if "same-origin" not in fe.header_joined("Referrer-Policy").lower():
        missing.append("frontend missing Referrer-Policy: same-origin")

    oidc_url = f"{auth_url.rstrip('/')}/realms/clinic/.well-known/openid-configuration"
    kc = requester(oidc_url, timeout=timeout)
    if kc.status != 200:
        missing.append(f"OIDC discovery status={kc.status} (expected 200)")
    else:
        try:
            doc = json.loads(kc.body)
            if not str(doc.get("issuer", "")).startswith(auth_url.rstrip("/")):
                missing.append("OIDC discovery issuer mismatch")
        except json.JSONDecodeError:
            missing.append("OIDC discovery invalid JSON")
    if "max-age=" not in kc.header_joined("Strict-Transport-Security").lower():
        missing.append("Keycloak missing Strict-Transport-Security")
    if "nosniff" not in kc.header_joined("X-Content-Type-Options").lower():
        missing.append("Keycloak missing X-Content-Type-Options: nosniff")

    if missing:
        return CheckResult(
            check_id="security-headers",
            case_id="AGENT-TC-009",
            passed=False,
            summary="Thiếu header bảo mật hoặc OIDC discovery lỗi",
            detail="; ".join(missing),
        )
    return CheckResult(
        check_id="security-headers",
        case_id="AGENT-TC-009",
        passed=True,
        summary="Frontend và Keycloak OIDC trả đủ security headers",
        detail="Frontend 200 với HSTS, CSP (frame-ancestors 'none', object-src 'none'), X-Frame-Options DENY, nosniff, Referrer-Policy same-origin; Keycloak OIDC discovery 200 với HSTS và nosniff.",
    )


def check_api_unauthenticated_guard(app_url: str, requester=fetch, timeout: int = 15) -> CheckResult:
    resp = requester(f"{app_url.rstrip('/')}/api/me/profile", timeout=timeout)
    passed = resp.status == 401
    return CheckResult(
        check_id="api-unauth-401",
        case_id="NA",
        passed=passed,
        summary="API /api/me/profile chặn truy cập ẩn danh với 401" if passed else f"API /api/me/profile trả {resp.status} thay vì 401",
        detail=f"GET /api/me/profile -> HTTP {resp.status}",
    )


def check_direct_access_grants_blocked(auth_url: str, requester=fetch, timeout: int = 15) -> CheckResult:
    token_url = f"{auth_url.rstrip('/')}/realms/clinic/protocol/openid-connect/token"
    payload = urllib.parse.urlencode({
        "grant_type": "password",
        "client_id": "clinic-web",
        "username": "smoke-nonexistent-user",
        "password": "smoke-invalid-password",
    }).encode("utf-8")
    resp = requester(
        token_url,
        method="POST",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=timeout,
    )
    error_code = ""
    try:
        error_code = str(json.loads(resp.body).get("error", ""))
    except json.JSONDecodeError:
        pass
    passed = resp.status == 400 and error_code == "unauthorized_client"
    return CheckResult(
        check_id="direct-access-grants",
        case_id="AGENT-TC-008",
        passed=passed,
        summary="Keycloak từ chối Direct Access Grants (unauthorized_client)" if passed else "Keycloak không trả unauthorized_client cho password grant",
        detail=f"POST token grant_type=password -> HTTP {resp.status}, error={error_code or 'NONE'}",
    )


def check_foreign_redirect_rejected(auth_url: str, requester=fetch, timeout: int = 15) -> CheckResult:
    query = urllib.parse.urlencode({
        "client_id": "clinic-web",
        "response_type": "code",
        "scope": "openid",
        "redirect_uri": "https://evil.example/callback",
    })
    url = f"{auth_url.rstrip('/')}/realms/clinic/protocol/openid-connect/auth?{query}"
    resp = requester(url, timeout=timeout, follow_redirects=False)
    location = resp.header_joined("Location")
    redirected_to_evil = location.lower().startswith("https://evil.example")
    passed = resp.status in (400, 403) and not redirected_to_evil
    return CheckResult(
        check_id="foreign-redirect-uri",
        case_id="AGENT-TC-007",
        passed=passed,
        summary="Keycloak từ chối redirect_uri ngoài allowlist" if passed else "Keycloak không từ chối redirect_uri ngoài allowlist",
        detail=f"GET auth redirect_uri=https://evil.example/callback -> HTTP {resp.status}, Location={location or 'NONE'}",
    )


def check_webrtc_ice_guard(app_url: str, requester=fetch, timeout: int = 15) -> CheckResult:
    resp = requester(f"{app_url.rstrip('/')}/api/webrtc/ice", timeout=timeout)
    cache = resp.header_joined("Cache-Control").lower()
    passed = resp.status == 401 and "no-store" in cache
    return CheckResult(
        check_id="webrtc-ice-guard",
        case_id="NA",
        passed=passed,
        summary="Endpoint /api/webrtc/ice chặn ẩn danh 401 với Cache-Control: no-store" if passed else f"/api/webrtc/ice trả {resp.status} (Cache-Control={cache or 'NONE'})",
        detail=f"GET /api/webrtc/ice -> HTTP {resp.status}, Cache-Control={cache or 'NONE'}",
    )


def probe_stun(host: str, port: int = 3478, timeout: int = 5) -> tuple[bool, str]:
    ip = socket.gethostbyname(host)
    tx = os.urandom(12)
    pkt = struct.pack("!HHI", 0x0001, 0, 0x2112A442) + tx
    for proto, sock_type in (("TCP", socket.SOCK_STREAM), ("UDP", socket.SOCK_DGRAM)):
        sock = socket.socket(socket.AF_INET, sock_type)
        sock.settimeout(timeout)
        try:
            if sock_type == socket.SOCK_STREAM:
                sock.connect((ip, port))
                sock.sendall(pkt)
                data = sock.recv(1024)
            else:
                sock.sendto(pkt, (ip, port))
                data, _ = sock.recvfrom(1024)
            if len(data) >= 20:
                mtype, _mlen, cookie = struct.unpack("!HHI", data[:8])
                if mtype == 0x0101 and cookie == 0x2112A442 and data[8:20] == tx:
                    return True, f"STUN {proto} {ip}:{port} -> Binding Success (0x0101, {len(data)}B)"
        except OSError:
            continue
        finally:
            sock.close()
    return False, f"STUN/TURN {ip}:{port} không phản hồi Binding Success trên TCP/UDP"


def check_stun_turn_server(app_url: str, stun_prober=probe_stun, port: int = 3478, timeout: int = 5) -> CheckResult:
    host = urllib.parse.urlparse(app_url).hostname or app_url
    ok, detail = stun_prober(host, port=port, timeout=timeout)
    return CheckResult(
        check_id="webrtc-stun-turn",
        case_id="NA",
        passed=ok,
        summary="Máy chủ coturn STUN/TURN 3478 phản hồi Binding Success" if ok else "Máy chủ coturn STUN/TURN 3478 không phản hồi",
        detail=detail,
    )


def run_all_checks(
    app_url: str,
    auth_url: str,
    requester=fetch,
    stun_prober=probe_stun,
    timeout: int = 15,
) -> list[CheckResult]:
    return [
        check_security_headers(app_url, auth_url, requester=requester, timeout=timeout),
        check_api_unauthenticated_guard(app_url, requester=requester, timeout=timeout),
        check_direct_access_grants_blocked(auth_url, requester=requester, timeout=timeout),
        check_foreign_redirect_rejected(auth_url, requester=requester, timeout=timeout),
        check_webrtc_ice_guard(app_url, requester=requester, timeout=timeout),
        check_stun_turn_server(app_url, stun_prober=stun_prober, timeout=min(timeout, 5)),
    ]


def render_markdown_summary(results: list[CheckResult], app_url: str, auth_url: str) -> str:
    lines = [
        "## ClinicCare Post-Deploy Live Smoke Verification",
        "",
        f"- App URL: `{app_url}`",
        f"- Auth URL: `{auth_url}`",
        "",
        "| Check | Case ID | Status | Detail |",
        "|---|---|---|---|",
    ]
    for item in results:
        status = "PASS" if item.passed else "FAIL"
        lines.append(f"| `{item.check_id}` | `{item.case_id}` | **{status}** | {item.detail} |")
    lines.append("")
    return "\n".join(lines)


def current_git_short_sha(repo_root: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=repo_root,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return "UNKNOWN"


def update_agent_catalog(
    results: list[CheckResult],
    *,
    catalog_path: Path,
    runs_path: Path,
    commit: str,
    environment: str,
    now: datetime | None = None,
) -> list[str]:
    timestamp = (now or datetime.now(VN_TZ)).replace(microsecond=0)
    date_prefix = timestamp.strftime("%Y%m%d")
    executed_at = timestamp.isoformat()

    with catalog_path.open("r", encoding="utf-8", newline="") as handle:
        catalog_reader = csv.DictReader(handle)
        catalog_fields = list(catalog_reader.fieldnames or [])
        catalog_rows = list(catalog_reader)

    with runs_path.open("r", encoding="utf-8", newline="") as handle:
        runs_reader = csv.DictReader(handle)
        runs_fields = list(runs_reader.fieldnames or [])
        runs_rows = list(runs_reader)

    existing_run_ids = {row["run_id"] for row in runs_rows}
    catalog_by_id = {row["case_id"]: row for row in catalog_rows}
    updated_cases: list[str] = []

    for item in results:
        if item.case_id == "NA" or item.case_id not in catalog_by_id:
            continue
        base_id = f"RUN-{date_prefix}-{item.case_id}"
        run_id = base_id
        rev = 2
        while run_id in existing_run_ids:
            run_id = f"{base_id}-R{rev}"
            rev += 1
        existing_run_ids.add(run_id)
        status = "PASS" if item.passed else "FAIL"
        runs_rows.append({
            "run_id": run_id,
            "case_id": item.case_id,
            "executed_at": executed_at,
            "commit": commit,
            "environment": environment,
            "status": status,
            "actual": item.detail,
            "evidence_ref": "NOT_RETAINED",
            "report_ref": "NOT_RETAINED",
            "notes": "Chạy tự động qua scripts/verify-live-demo.py --update-catalog.",
        })
        catalog_by_id[item.case_id]["last_status"] = status
        catalog_by_id[item.case_id]["last_run_id"] = run_id
        updated_cases.append(f"{item.case_id}={status} ({run_id})")

    with catalog_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=catalog_fields)
        writer.writeheader()
        writer.writerows(catalog_rows)

    with runs_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=runs_fields)
        writer.writeheader()
        writer.writerows(runs_rows)

    return updated_cases


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify live ClinicCare Azure demo responses.")
    parser.add_argument("--app-url", default=DEFAULT_APP_URL)
    parser.add_argument("--auth-url", default=DEFAULT_AUTH_URL)
    parser.add_argument("--timeout", type=int, default=15)
    parser.add_argument("--summary-md", help="Write Markdown summary to this file (e.g. GITHUB_STEP_SUMMARY).")
    parser.add_argument(
        "--update-catalog",
        action="store_true",
        help="Append results to docs/testing/agent-test-runs.csv and update docs/testing/agent-test-catalog.csv.",
    )
    args = parser.parse_args(argv)

    results = run_all_checks(args.app_url, args.auth_url, timeout=args.timeout)
    for item in results:
        tag = "PASS" if item.passed else "FAIL"
        print(f"[{tag}] {item.check_id} ({item.case_id}): {item.detail}")

    if args.summary_md:
        summary_path = Path(args.summary_md)
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        with summary_path.open("a", encoding="utf-8") as handle:
            handle.write(render_markdown_summary(results, args.app_url, args.auth_url))

    if args.update_catalog:
        catalog_path = ROOT / "docs/testing/agent-test-catalog.csv"
        runs_path = ROOT / "docs/testing/agent-test-runs.csv"
        updated = update_agent_catalog(
            results,
            catalog_path=catalog_path,
            runs_path=runs_path,
            commit=current_git_short_sha(ROOT),
            environment=f"Azure demo HTTPS ({args.app_url} & {args.auth_url}); scripts/verify-live-demo.py",
        )
        print("Updated catalog:", ", ".join(updated))

    return 0 if all(item.passed for item in results) else 1


if __name__ == "__main__":
    sys.exit(main())
