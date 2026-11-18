"""Generate independent secrets and the Keycloak demo realm for Internet Compose."""

import argparse
import base64
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets


ROOT = Path(__file__).resolve().parents[1]
HOST = re.compile(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$")


def write_new(path, text):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as file:
        file.write(text)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-host", required=True)
    parser.add_argument("--auth-host", required=True)
    parser.add_argument("--turn-public-ip", type=ipaddress.IPv4Address, required=True)
    parser.add_argument("--turn-bind-ip", type=ipaddress.IPv4Address,
                        help="Host interface IPv4, defaults to the public IP")
    args = parser.parse_args()
    if not all(HOST.fullmatch(host) for host in (args.app_host, args.auth_host)):
        parser.error("Use lowercase DNS hostnames without a scheme, path or port")
    if args.app_host == args.auth_host:
        parser.error("Use different app and authentication hostnames")
    if not args.turn_public_ip.is_global or args.turn_public_ip.is_multicast:
        parser.error("TURN requires a public unicast IPv4 address")
    bind_ip = args.turn_bind_ip or args.turn_public_ip
    if bind_ip.is_unspecified or bind_ip.is_loopback or bind_ip.is_multicast or bind_ip.is_link_local:
        parser.error("Use the TURN host's reachable interface IPv4")

    runtime = ROOT / "infra/runtime/internet"
    realm_path = runtime / "clinic-realm.json"
    env_path = ROOT / ".env.internet"
    if env_path.exists() or realm_path.exists():
        parser.error("Internet deployment files already exist. Preserve them and edit deployment settings in place.")

    realm = json.loads((ROOT / "infra/keycloak/realm-template.json").read_text(encoding="utf-8-sig"))
    realm.update(sslRequired="all", bruteForceProtected=True)
    realm["clients"] = [client for client in realm["clients"] if client["clientId"] == "clinic-web"]
    client = realm["clients"][0]
    origin = f"https://{args.app_host}"
    client.update(redirectUris=[f"{origin}/callback"], webOrigins=[origin])
    client["attributes"]["post.logout.redirect.uris"] = f"{origin}/login?loggedout=1"
    demo_password = os.environ.get("DEMO_PASSWORD") or "DemoClinic"
    if any(char in demo_password for char in "\r\n"):
        parser.error("DEMO_PASSWORD must fit on one line.")
    for user in realm["users"]:
        user["credentials"] = [
            {"type": "password", "value": demo_password, "temporary": False}
        ]

    values = {
        "APP_HOST": args.app_host,
        "AUTH_HOST": args.auth_host,
        "TURN_PUBLIC_IP": str(args.turn_public_ip),
        "TURN_BIND_IP": str(bind_ip),
        "ICE_POLICY": "all",
        "DEMO_PASSWORD": demo_password,
        "DB_PASSWORD": secrets.token_urlsafe(32),
        "MYSQL_ROOT_PASSWORD": secrets.token_urlsafe(32),
        "KEYCLOAK_ADMIN_PASSWORD": secrets.token_urlsafe(32),
        "DATA_ENCRYPTION_KEY": base64.b64encode(secrets.token_bytes(32)).decode("ascii"),
        "TURN_SHARED_SECRET": secrets.token_hex(32),
    }
    runtime.mkdir(parents=True, exist_ok=True)
    # Keycloak runs as a different UID. Protect the host directory while
    # keeping the individually bind-mounted realm readable inside Keycloak.
    if os.name == "posix":
        runtime.chmod(0o700)
    write_new(realm_path, json.dumps(realm, ensure_ascii=False, indent=2) + "\n")
    if os.name == "posix":
        realm_path.chmod(0o644)
    write_new(env_path, "".join(f"{key}={value}\n" for key, value in values.items()))
    print("Created .env.internet and infra/runtime/internet/clinic-realm.json")


if __name__ == "__main__":
    main()
