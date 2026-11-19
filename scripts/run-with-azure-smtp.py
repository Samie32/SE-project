"""Store protected SMTP configuration on the VM and load it for deployments."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


CONFIG = Path("/var/lib/cliniccare/smtp.json")


def parse_credentials(raw):
    credentials = json.loads(raw)
    values = {key: credentials[key] for key in ("username", "password", "from")}
    if any(not isinstance(value, str) or not value.strip() or any(c in value for c in "\x00\r\n")
           for value in values.values()):
        raise ValueError("Invalid SMTP configuration")
    return values


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
        pending.replace(CONFIG)
    finally:
        pending.unlink(missing_ok=True)
    return True


def smtp_environment():
    if not CONFIG.exists():
        return {}
    credentials = parse_credentials(CONFIG.read_text(encoding="utf-8"))
    return {
        "SMTP_HOST": "smtp-relay.brevo.com",
        "SMTP_PORT": "587",
        "SMTP_AUTH": "true",
        "SMTP_STARTTLS": "true",
        "SMTP_USERNAME": credentials["username"],
        "SMTP_PASSWORD": credentials["password"],
        "SMTP_FROM": credentials["from"],
    }


def main(args):
    try:
        if args == ["store"]:
            changed = store(os.environ["BREVO_SMTP_CONFIG"])
            print("CLINICCARE_SMTP_UPDATED" if changed else "CLINICCARE_SMTP_UNCHANGED")
            return 0
        env = os.environ | smtp_environment()
    except (KeyError, OSError, ValueError, TypeError):
        print("ClinicCare could not load or save its protected SMTP configuration.", file=sys.stderr)
        return 1
    return subprocess.run(args, env=env, check=False).returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
