"""Recover missed deployments when the ClinicCare Azure VM starts."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEPLOYED_SHA = Path("/var/lib/cliniccare/deployed-sha")
ACTIONS = "https://api.github.com/repos/Samie32/SE-project/actions/"
REQUIRED_CHECKS = ("frontend / verify", "backend / verify", "api-contract / validate")


def main_sha():
    result = subprocess.run(
        ["git", "ls-remote", "--exit-code", "origin", "refs/heads/main"],
        cwd=ROOT, check=True, capture_output=True, text=True, timeout=30,
    )
    sha, ref = result.stdout.strip().split("\t")
    if ref != "refs/heads/main" or not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("GitHub returned an invalid main ref")
    return sha


def github(path):
    request = Request(ACTIONS + path, headers={"Accept": "application/vnd.github+json"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def deployment_was_attempted(sha):
    query = urlencode({"branch": "main", "head_sha": sha, "status": "completed", "per_page": 10})
    for run in github("workflows/deploy-azure-demo.yml/runs?" + query)["workflow_runs"]:
        if run["head_sha"] != sha:
            continue
        jobs = github(f"runs/{run['id']}/jobs?filter=latest")["jobs"]
        conclusions = {job["name"]: job["conclusion"] for job in jobs}
        if (
            all(conclusions.get(name) == "success" for name in REQUIRED_CHECKS)
            and conclusions.get("deploy") in {"failure", "success", "timed_out"}
        ):
            return True
    return False


def check():
    print("ClinicCare boot check: checking GitHub main", flush=True)
    sha = main_sha()
    deployed_sha = DEPLOYED_SHA.read_text(encoding="ascii").strip() if DEPLOYED_SHA.exists() else ""
    if sha == deployed_sha:
        print(f"ClinicCare boot check: already deployed {sha}", flush=True)
        return 0
    if not deployment_was_attempted(sha):
        print(f"ClinicCare boot check: waiting for eligible GitHub Actions run for {sha}", flush=True)
        return 75

    print(f"ClinicCare boot check: deploying {sha}", flush=True)
    return subprocess.run(
        ["sh", str(ROOT / "scripts/deploy-azure-demo.sh")],
        env=dict(os.environ, DEPLOY_SHA=sha, SKIP_IF_DEPLOYED="1"),
    ).returncode


if __name__ == "__main__":
    try:
        sys.exit(check())
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        print(f"ClinicCare boot check: {error}", file=sys.stderr)
        sys.exit(1)
