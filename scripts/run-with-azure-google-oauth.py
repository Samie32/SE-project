"""Store protected Google OAuth configuration on the VM and load it for deployments."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


CONFIG = Path("/var/lib/cliniccare/google-oauth.json")


def parse_credentials(raw):
    credentials = json.loads(raw)
    values = {key: credentials[key] for key in ("clientId", "clientSecret")}
    if any(not isinstance(value, str) or not value.strip() or any(c in value for c in "\x00\r\n")
           for value in values.values()):
        raise ValueError("Invalid Google OAuth configuration")
    return {key: value.strip() for key, value in values.items()}


def store(raw):
    serialized = json.dumps(parse_credentials(raw)) + "\n"
    CONFIG.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    if CONFIG.exists() and CONFIG.read_text(encoding="utf-8") == serialized:
        CONFIG.chmod(0o600)
        return False
    file = tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=CONFIG.parent, delete=False)
    pending = Path(file.name)
    try:
        with file:
            file.write(serialized)
        pending.chmod(0o600)
        pending.replace(CONFIG)
    finally:
        pending.unlink(missing_ok=True)
    return True


def oauth_environment():
    if not CONFIG.exists():
        return {}
    credentials = parse_credentials(CONFIG.read_text(encoding="utf-8"))
    return {
        "GOOGLE_CLIENT_ID": credentials["clientId"],
        "GOOGLE_CLIENT_SECRET": credentials["clientSecret"],
    }


def main(args):
    try:
        if args == ["store"]:
            changed = store(os.environ["GOOGLE_OAUTH_CONFIG"])
            print("CLINICCARE_GOOGLE_OAUTH_UPDATED" if changed else "CLINICCARE_GOOGLE_OAUTH_UNCHANGED")
            return 0
        env = os.environ | oauth_environment()
    except (KeyError, OSError, ValueError, TypeError):
        print("ClinicCare could not load or save its protected Google OAuth configuration.", file=sys.stderr)
        return 1
    return subprocess.run(args, env=env, check=False).returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
