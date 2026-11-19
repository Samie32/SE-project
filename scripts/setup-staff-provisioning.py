"""Configure the server-only staff provisioning client in local Keycloak."""

import os
from pathlib import Path
import secrets
import sys
from time import monotonic, sleep
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data_demo"))
import load_local_demo as demo

CLIENT = "clinic-staff-provisioner"
CLIENTS = "/admin/realms/clinic/clients"
SECRET_VAR = "KEYCLOAK_STAFF_CLIENT_SECRET"


def configure():
    path = ROOT / ".env"
    config = demo.read_env(path)
    password = config["KEYCLOAK_ADMIN_PASSWORD"]
    deadline = monotonic() + 90
    while True:
        try:
            admin = demo.login("admin", password, realm="master", client="admin-cli")
            break
        except (OSError, demo.RequestFailed) as error:
            if getattr(error, "status", 0) in (400, 401, 403) or monotonic() >= deadline:
                raise
            sleep(2)

    def request(path, method="GET", body=None):
        return demo.request(demo.OIDC, path, method, body, token=admin)

    secret = os.getenv(SECRET_VAR) or config.get(SECRET_VAR)
    persist = not secret or secret.startswith("replace-")
    if persist:
        secret = secrets.token_urlsafe(32)
    query = CLIENTS + "?" + urlencode({"clientId": CLIENT})
    settings = {
        "clientId": CLIENT, "enabled": True, "protocol": "openid-connect",
        "publicClient": False, "clientAuthenticatorType": "client-secret",
        "standardFlowEnabled": False, "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False, "serviceAccountsEnabled": True,
        "secret": secret,
    }
    found = request(query)
    if not found:
        request(CLIENTS, "POST", settings)
        found = request(query)
    if len(found) != 1 or found[0]["clientId"] != CLIENT or found[0]["publicClient"] or not found[0]["serviceAccountsEnabled"]:
        raise RuntimeError("Unexpected Keycloak provisioning client.")
    client = found[0]["id"]
    if request(f"{CLIENTS}/{client}/client-secret")["value"] != secret:
        if not persist:
            raise RuntimeError("The configured provisioning secret differs from the Keycloak client secret.")
        secret = request(f"{CLIENTS}/{client}/client-secret")["value"]
    account = request(f"{CLIENTS}/{client}/service-account-user")["id"]
    management = request(CLIENTS + "?clientId=realm-management")[0]["id"]
    role = request(f"{CLIENTS}/{management}/roles/manage-users")
    request(f"/admin/realms/clinic/users/{account}/role-mappings/clients/{management}", "POST", [role])
    if persist:
        lines = path.read_text(encoding="utf-8-sig").splitlines()
        lines = [line for line in lines if not line.startswith(SECRET_VAR + "=")]
        path.write_text("\n".join([*lines, f"{SECRET_VAR}={secret}"]) + "\n", encoding="utf-8")
    print("Keycloak staff provisioning client is ready.")


if __name__ == "__main__":
    try:
        configure()
    except (OSError, KeyError, ValueError, RuntimeError) as error:
        raise SystemExit(f"Staff provisioning setup failed: {error}") from None
