"""Load the team demo data through the API in the isolated local Compose stack."""

import argparse
from datetime import date, datetime, time, timedelta, timezone
import json
from pathlib import Path
import subprocess
from time import monotonic, sleep
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener
from uuid import NAMESPACE_URL, uuid5


ROOT = Path(__file__).resolve().parents[1]
PROJECT = "clinic-telehealth-integration"
VN = timezone(timedelta(hours=7))
API = "http://127.0.0.1:8080/api"
OIDC = "http://127.0.0.1:8180"
KEYCLOAK_USERS_PATH = "/admin/realms/clinic/users"
DOCTOR = "doctor2"
PATIENT = "patient3"
DOCTOR_GIVEN_NAME = "Minh An"
DOCTOR_FAMILY_NAME = "Nguyễn"
PATIENT_GIVEN_NAME = "Hoàng Minh"
PATIENT_FAMILY_NAME = "Trần"
DOCTOR_NAME = f"{DOCTOR_FAMILY_NAME} {DOCTOR_GIVEN_NAME}"
SPECIALTIES = ("Nội tổng quát", "Da liễu")
CANCEL_REASON = "Bệnh nhân bận và chủ động hủy lịch."
CLINICAL_NOTE = (
    "Dữ liệu mô phỏng. Bệnh nhân đến khám vì khó chịu nhẹ và được hẹn theo dõi. "
    "Nội dung chỉ dùng để trình diễn quy trình ghi hồ sơ."
)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


HTTP = build_opener(ProxyHandler({}), NoRedirect())


class RequestFailed(RuntimeError):
    def __init__(self, method, path, status):
        super().__init__(f"{method} {path} -> HTTP {status}")
        self.status = status


def request(base, path, method="GET", body=None, token=None, key=None, *, form=False):
    headers = {"Accept": "application/json"}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if key:
        headers["Idempotency-Key"] = str(uuid5(NAMESPACE_URL, f"cliniccare/local-demo/{key}"))
    if body is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded" if form else "application/json"
        data = (urlencode(body) if form else json.dumps(body)).encode("utf-8")
    try:
        with HTTP.open(Request(base + path, data=data, headers=headers, method=method), timeout=15) as res:
            payload = res.read()
            return json.loads(payload) if payload else None
    except HTTPError as exc:
        raise RequestFailed(method, path, exc.code) from None


def api(token, path, method="GET", body=None, key=None):
    return request(API, path, method, body, token, key)


def require_local_stack():
    ports = {"backend": ("8080/tcp", "8080"), "keycloak": ("8080/tcp", "8180")}
    for service, (container_port, host_port) in ports.items():
        cmd = ["docker", "compose", "-p", PROJECT, "ps", "-q", service]
        ids = subprocess.check_output(cmd, cwd=ROOT, text=True).split()
        if len(ids) != 1:
            raise RuntimeError(f"Start the isolated {PROJECT} stack first ({service}).")
        out = subprocess.check_output(["docker", "inspect", ids[0]], cwd=ROOT, text=True)
        container = json.loads(out)[0]
        bindings = container["NetworkSettings"]["Ports"].get(container_port) or []
        if not container["State"]["Running"] or bindings != [{"HostIp": "127.0.0.1", "HostPort": host_port}]:
            raise RuntimeError(f"Expected {service} of {PROJECT} bound to 127.0.0.1:{host_port}.")


def local_secrets():
    values = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("'\"")
    for name in ("DEMO_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD"):
        if not values.get(name) or values[name].startswith("replace-"):
            raise RuntimeError(f"Missing {name} in local .env.")
    return values


def wait_for_services():
    deadline = monotonic() + 60
    endpoints = (
        (API.removesuffix("/api"), "/actuator/health", "backend"),
        (OIDC, "/realms/clinic/.well-known/openid-configuration", "Keycloak realm clinic"),
    )
    for base, path, service in endpoints:
        while True:
            try:
                request(base, path)
                break
            except (RequestFailed, URLError, TimeoutError):
                if monotonic() >= deadline:
                    raise RuntimeError(f"{service} is not ready. Check Docker Compose logs.") from None
                sleep(2)


def login(user, password, *, realm="clinic", client="clinic-local-cli"):
    return request(OIDC, f"/realms/{realm}/protocol/openid-connect/token", "POST", {
        "grant_type": "password", "client_id": client, "username": user, "password": password,
    }, form=True)["access_token"]


def keycloak_users(admin, username):
    query = "?" + urlencode({"username": username, "exact": "true"})
    return request(OIDC, KEYCLOAK_USERS_PATH + query, token=admin)


def ensure_keycloak_user(admin, username, first_name, last_name, password, rows):
    email = f"{username}@example.test"
    if not rows:
        request(OIDC, KEYCLOAK_USERS_PATH, "POST", {
            "username": username, "firstName": first_name, "lastName": last_name,
            "email": email, "emailVerified": True, "enabled": True,
            "credentials": [{"type": "password", "value": password, "temporary": False}],
        }, token=admin)
    elif len(rows) != 1 or any(rows[0].get(key) != value for key, value in {
        "username": username, "email": email, "firstName": first_name, "lastName": last_name,
    }.items()):
        raise RuntimeError(f"Existing Keycloak user {username} does not belong to this demo pack.")


def next_workday(day):
    day += timedelta(days=1)
    return day + timedelta(days=1) if day.weekday() == 6 else day


def at(day, clock):
    return datetime.combine(day, time.fromisoformat(clock), VN)


def iso(value):
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def same_time(row, key, expected):
    return datetime.fromisoformat(row[key].replace("Z", "+00:00")) == expected


def ensure_doctor(admin, doctor_token):
    profile = api(doctor_token, "/me/profile")
    roles = set(profile["roles"])
    doctor_id = profile["doctorId"]
    if (doctor_id and roles not in ({"DOCTOR"}, {"DOCTOR", "PATIENT"})) or (
        not doctor_id and roles != {"PATIENT"}
    ):
        raise RuntimeError("Unexpected roles on the dedicated demo doctor.")
    specialties = {row["name"]: row["id"] for row in api(admin, "/specialties")}
    ids = []
    for name in SPECIALTIES:
        ids.append(specialties.get(name) or api(admin, "/specialties", "POST", {"name": name})["id"])
    if not doctor_id:
        doctor_id = api(admin, "/doctors", "POST", {"userId": profile["id"], "specialtyIds": ids})["id"]
    if profile["displayName"] == "Patient":
        api(admin, f"/doctors/{doctor_id}", "PUT", {
            "active": True, "displayName": DOCTOR_NAME, "specialtyIds": ids,
        })
    profile = api(doctor_token, "/me/profile")
    if set(profile["roles"]) != {"DOCTOR"}:
        if set(profile["roles"]) != {"DOCTOR", "PATIENT"}:
            raise RuntimeError("Unexpected roles on the dedicated demo doctor.")
        api(admin, f"/users/{profile['id']}/roles", "PUT", {"roles": ["DOCTOR"]})
    return doctor_id


def ensure_interval(admin, doctor_id, resource, start, end, **fields):
    path = f"/doctors/{doctor_id}/{resource}"
    for row in api(admin, path):
        if same_time(row, "startAt", start) and same_time(row, "endAt", end):
            if not all(row[key] == value for key, value in fields.items()):
                raise RuntimeError(f"Existing {resource} has different settings at {start.isoformat()}.")
            return row
    return api(admin, path, "POST", {"startAt": iso(start), "endAt": iso(end), **fields})


def find_appointment(patient, doctor_id, start, mode):
    offset = 0
    while True:
        rows = api(patient, f"/appointments?limit=100&offset={offset}")
        matches = [a for a in rows if a["doctorId"] == doctor_id and a["mode"] == mode
                   and same_time(a, "startAt", start)]
        live = [a for a in matches if a["status"] != "CANCELLED"]
        if live:
            return live[0]
        cancelled = next((a for a in matches if a.get("cancellationReason") == CANCEL_REASON), None)
        if cancelled or len(rows) < 100:
            return cancelled
        offset += len(rows)


def slot_at(patient, doctor_id, start, mode):
    path = "/slots?" + urlencode({"date": start.date().isoformat(), "doctorId": doctor_id, "mode": mode})
    slot = next((s for s in api(patient, path) if same_time(s, "startAt", start)), None)
    if not slot:
        raise RuntimeError(f"No bookable demo slot at {start.isoformat()} ({mode}).")
    return slot


def ensure_booking(patient, doctor_id, start, mode):
    existing = find_appointment(patient, doctor_id, start, mode)
    if existing:
        return existing
    slot = slot_at(patient, doctor_id, start, mode)
    return api(patient, "/appointments", "POST", {"slotId": slot["id"]}, f"book:{slot['id']}")


def appointment_command(token, appointment, action, **fields):
    appointment_id, version = appointment["id"], appointment["version"]
    return api(token, f"/appointments/{appointment_id}/{action}", "POST", {
        "version": version, **fields,
    }, f"{action}:{appointment_id}:{version}")


def show(label, row):
    start = datetime.fromisoformat(row["startAt"].replace("Z", "+00:00")).astimezone(VN)
    print(f"{label}: {start:%Y-%m-%d %H:%M} UTC+7 | {row['status']} | {row['id']}")


def load_future(admin, patient, doctor_id, first, second):
    for day in (first, second):
        ensure_interval(admin, doctor_id, "availability", at(day, "09:00"), at(day, "11:00"),
                        mode="IN_PERSON", slotMinutes=15)
        ensure_interval(admin, doctor_id, "availability", at(day, "14:00"), at(day, "16:00"),
                        mode="REMOTE", slotMinutes=30)
    ensure_interval(admin, doctor_id, "time-off", at(second, "14:30"), at(second, "15:00"))

    show("In-person", ensure_booking(patient, doctor_id, at(first, "09:00"), "IN_PERSON"))
    show("Remote", ensure_booking(patient, doctor_id, at(first, "14:00"), "REMOTE"))
    cancelled = ensure_booking(patient, doctor_id, at(first, "09:15"), "IN_PERSON")
    if cancelled["status"] == "CONFIRMED":
        cancelled = appointment_command(patient, cancelled, "cancel", reason=CANCEL_REASON)
    show("Cancelled example", cancelled)
    moved_to = at(second, "10:30")
    moved = find_appointment(patient, doctor_id, moved_to, "IN_PERSON")
    if not moved:
        original = ensure_booking(patient, doctor_id, at(second, "10:00"), "IN_PERSON")
        slot = slot_at(patient, doctor_id, moved_to, "IN_PERSON")
        moved = appointment_command(patient, original, "reschedule", slotId=slot["id"])
    show("Rescheduled example", moved)


def load_clinical(admin, patient, doctor, receptionist, doctor_id, start):
    end = start + timedelta(minutes=15)
    if start.weekday() == 6 or not time(8) <= start.time() < end.time() <= time(17):
        raise RuntimeError("The clinical slot must fit in 08:00–17:00 Monday–Saturday.")
    appointment = find_appointment(patient, doctor_id, start, "IN_PERSON")
    if not appointment:
        if not datetime.now(VN) < start <= datetime.now(VN) + timedelta(minutes=14):
            raise RuntimeError("Choose a clinical start in the next 14 minutes (Vietnam time).")
        ensure_interval(admin, doctor_id, "availability", start, end, mode="IN_PERSON", slotMinutes=15)
        appointment = ensure_booking(patient, doctor_id, start, "IN_PERSON")
    appointment_id = appointment["id"]
    detail_path = f"/appointments/{appointment_id}"
    queue_path = f"/doctors/{doctor_id}/queue"
    queue_query = "?date=" + start.date().isoformat()
    status = appointment["status"]
    if status == "CONFIRMED":
        api(receptionist, detail_path + "/check-in", "POST", key=f"checkin:{appointment_id}")
        status = api(doctor, detail_path)["status"]
    if status == "CHECKED_IN":
        queue = api(doctor, queue_path + queue_query)
        current = next((q for q in queue if q["status"] in ("CALLED", "IN_SERVICE")), None)
        if not current:
            waiting = next((q for q in queue if q["status"] == "WAITING"), None)
            if not waiting or waiting["appointmentId"] != appointment_id:
                raise RuntimeError("The demo appointment is not first in the queue.")
            current = api(doctor, queue_path + "/next" + queue_query, "POST",
                          key=f"next:{appointment_id}:{waiting['version']}")
        if current["appointmentId"] != appointment_id or current["status"] != "CALLED":
            raise RuntimeError("Another ticket is active. Resolve it normally before retrying.")
        appointment_command(doctor, api(doctor, detail_path), "progress", targetStatus="IN_PROGRESS")
        status = "IN_PROGRESS"
    if status == "COMPLETED":
        show("Clinical completed", appointment)
        return
    if status != "IN_PROGRESS":
        raise RuntimeError(f"Unexpected clinical status: {status}.")
    encounter = "/encounters/" + api(doctor, detail_path)["encounterId"]
    record_path = encounter + "/record"
    try:
        record = api(doctor, record_path)
    except RequestFailed as exc:
        if exc.status != 404:
            raise
        record = None
    if not record:
        record = api(doctor, record_path, "PUT", {"version": 0, "content": CLINICAL_NOTE, "status": "DRAFT"},
                     f"draft:{encounter}")
    if record["status"] == "DRAFT":
        api(doctor, record_path, "PUT", {"version": record["version"], "content": CLINICAL_NOTE, "status": "FINAL"},
            f"final:{encounter}:{record['version']}")

    rx_path = encounter + "/prescriptions"
    prescriptions = api(doctor, rx_path)
    item = {"medicineName": "Mục minh họa (không phải thuốc)", "doseText": "Dữ liệu giả",
            "route": "Minh họa", "frequency": "Minh họa", "durationText": "Minh họa"}
    rx = prescriptions[0] if prescriptions else api(doctor, rx_path, "POST", {"items": [item]}, f"rx:{encounter}")
    if rx["status"] == "DRAFT":
        api(doctor, f"/prescriptions/{rx['id']}/issue", "POST", {"version": rx["version"]},
            f"issue:{rx['id']}:{rx['version']}")
    completed = appointment_command(doctor, api(doctor, detail_path), "progress", targetStatus="COMPLETED")
    show("Clinical completed (FINAL record + ISSUED prescription)", completed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write demo data to the isolated local stack.")
    parser.add_argument("--date", type=date.fromisoformat, help="First future date (YYYY-MM-DD, Vietnam).")
    parser.add_argument("--clinical-at", help="Optional clinical example today at HH:MM Vietnam time.")
    args = parser.parse_args()
    today = datetime.now(VN).date()
    first = args.date or next_workday(today)
    if first <= today or first.weekday() == 6:
        parser.error("--date must be a future Monday–Saturday.")
    second = next_workday(first)
    clinical = at(today, args.clinical_at) if args.clinical_at else None
    if clinical and args.clinical_at != clinical.strftime("%H:%M"):
        parser.error("--clinical-at must use HH:MM.")
    print(f"Local project: {PROJECT}; dates: {first}, {second} (UTC+7)")
    if not args.apply:
        print("Plan only: 2 accounts, 2 specialties, 4 shifts, 1 time-off and 4 future appointments.")
        if clinical:
            print(f"Optional completed clinical case today at {clinical:%H:%M} (UTC+7).")
        return

    require_local_stack()
    env = local_secrets()
    wait_for_services()
    password = env["DEMO_PASSWORD"]
    kc_admin = login("admin", env["KEYCLOAK_ADMIN_PASSWORD"], realm="master", client="admin-cli")
    admin = login("admin", password)
    doctor_users = keycloak_users(kc_admin, DOCTOR)
    patient_users = keycloak_users(kc_admin, PATIENT)
    if not doctor_users or not patient_users:
        doctors = api(admin, "/doctors")
        if any(row["displayName"] == DOCTOR_NAME for row in doctors):
            raise RuntimeError("Demo identities are missing from Keycloak but MySQL has demo data. "
                               "Restore the matching Keycloak data or start a fresh demo environment.")
    ensure_keycloak_user(kc_admin, DOCTOR, DOCTOR_GIVEN_NAME, DOCTOR_FAMILY_NAME, password, doctor_users)
    ensure_keycloak_user(kc_admin, PATIENT, PATIENT_GIVEN_NAME, PATIENT_FAMILY_NAME, password, patient_users)
    doctor = login(DOCTOR, password)
    patient = login(PATIENT, password)
    if set(api(patient, "/me/profile")["roles"]) != {"PATIENT"}:
        raise RuntimeError("Unexpected roles on the dedicated demo patient.")
    doctor_id = ensure_doctor(admin, doctor)
    if not api(patient, "/appointments?limit=1"):
        api(patient, "/me/contact", "PUT", {"email": f"{PATIENT}@example.test"})
    load_future(admin, patient, doctor_id, first, second)
    if clinical:
        load_clinical(admin, patient, doctor, login("receptionist", password), doctor_id, clinical)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        raise SystemExit(f"Demo load stopped: {exc}") from None
