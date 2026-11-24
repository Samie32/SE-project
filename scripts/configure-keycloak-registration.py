"""Configure realm email registration through the Keycloak Admin REST API."""

import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPHandler, ProxyHandler, Request, build_opener


def build_smtp_server(env):
    """Build Keycloak realm smtpServer settings when SMTP credentials are complete."""
    host = env.get("SMTP_HOST", "").strip()
    sender = env.get("SMTP_FROM", "").strip()
    if not host or not sender:
        return None
    port = env.get("SMTP_PORT", "587").strip() or "587"
    auth = env.get("SMTP_AUTH", "false").strip().lower() == "true"
    starttls = env.get("SMTP_STARTTLS", "false").strip().lower() == "true"
    smtp = {
        "host": host,
        "port": port,
        "from": sender,
        "fromDisplayName": "ClinicCare",
        "starttls": "true" if starttls else "false",
        "auth": "true" if auth else "false",
    }
    if auth:
        user = env.get("SMTP_USERNAME", "").strip()
        password = env.get("SMTP_PASSWORD", "").strip()
        if not user or not password:
            return None
        smtp["user"] = user
        smtp["password"] = password
    return smtp


def build_realm_payload(smtp_server):
    """Build realm settings including registration, brute-force protection, and email recovery."""
    payload = {
        "loginTheme": "cliniccare",
        "rememberMe": True,
        "registrationAllowed": True,
        "registrationEmailAsUsername": True,
        "loginWithEmailAllowed": True,
        "editUsernameAllowed": False,
        "duplicateEmailsAllowed": False,
        "passwordPolicy": "length(8)",
        "bruteForceProtected": True,
        "permanentLockout": False,
        "failureFactor": 5,
        "waitIncrementSeconds": 60,
        "maxFailureWaitSeconds": 900,
        "maxDeltaTimeSeconds": 900,
        "resetPasswordAllowed": smtp_server is not None,
    }
    if smtp_server is not None:
        payload["smtpServer"] = smtp_server
    return payload


PROFILE_ATTRIBUTE_MAPPERS = [
    ("profile-phone-number", "phoneNumber"),
    ("profile-birth-date", "birthDate"),
    ("profile-hometown", "hometown"),
    ("profile-permanent-address", "permanentAddress"),
]


def ensure_profile_claim_mappers(opener, base, token, app_host=None):
    """Ensure clinic-web exposes registration profile claims and matches APP_HOST redirects."""
    clients_request = Request(
        base + "/admin/realms/clinic/clients?clientId=clinic-web",
        headers={"Authorization": "Bearer " + token},
    )
    with opener.open(clients_request, timeout=10) as response:
        clients = json.load(response)
    if len(clients) != 1:
        return
    client = clients[0]
    mappers = list(client.get("protocolMappers") or [])
    existing_names = {m.get("name") for m in mappers}
    headers = {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
    }

    if app_host:
        origin = "https://" + app_host
        client["redirectUris"] = [origin + "/callback"]
        client["webOrigins"] = [origin]
        client.setdefault("attributes", {})["post.logout.redirect.uris"] = origin + "/login?loggedout=1"
        update_request = Request(
            base + "/admin/realms/clinic/clients/" + client["id"],
            data=json.dumps(client).encode(),
            headers=headers,
            method="PUT",
        )
        with opener.open(update_request, timeout=10):
            pass

    mappers_url = base + "/admin/realms/clinic/clients/" + client["id"] + "/protocol-mappers/models"
    for mapper_name, attr_name in PROFILE_ATTRIBUTE_MAPPERS:
        if mapper_name in existing_names:
            continue
        mapper_payload = json.dumps({
            "name": mapper_name,
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "config": {
                "user.attribute": attr_name,
                "claim.name": attr_name,
                "jsonType.label": "String",
                "id.token.claim": "true",
                "access.token.claim": "true",
                "userinfo.token.claim": "true",
            },
        }).encode()
        try:
            with opener.open(Request(mappers_url, data=mapper_payload, headers=headers, method="POST"), timeout=10):
                pass
        except HTTPError as error:
            if error.code != 409:
                raise


def configure_google_idp(opener, base, token, client_id, client_secret):
    """Create or update the Google OIDC identity provider in the clinic realm."""
    instance_url = base + "/admin/realms/clinic/identity-provider/instances/google"
    collection_url = base + "/admin/realms/clinic/identity-provider/instances"
    payload = json.dumps({
        "alias": "google",
        "displayName": "Google",
        "providerId": "google",
        "enabled": True,
        "trustEmail": True,
        "storeToken": False,
        "addReadTokenRoleOnCreate": False,
        "authenticateByDefault": False,
        "linkOnly": False,
        "hideOnLogin": False,
        "firstBrokerLoginFlowAlias": "first broker login",
        "config": {
            "clientId": client_id,
            "clientSecret": client_secret,
            "defaultScope": "openid profile email",
            "useJwksUrl": "true",
        },
    }).encode()
    headers = {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
    }
    try:
        with opener.open(Request(instance_url, headers={"Authorization": "Bearer " + token}), timeout=10):
            pass
        method, target = "PUT", instance_url
    except HTTPError as error:
        if error.code != 404:
            raise
        method, target = "POST", collection_url

    with opener.open(Request(target, data=payload, headers=headers, method=method), timeout=10):
        pass


def main():
    base = "http://keycloak:8080"
    username = os.environ["KC_BOOTSTRAP_ADMIN_USERNAME"]
    password = os.environ["KC_BOOTSTRAP_ADMIN_PASSWORD"]
    app_host = os.environ.get("APP_HOST")
    template_path = Path("/app/infra/keycloak/realm-template.json")
    template = json.loads(template_path.read_text(encoding="utf-8-sig")) if template_path.exists() else {}
    opener = build_opener(ProxyHandler({}), HTTPHandler())

    for attempt in range(30):
        try:
            token_request = Request(
                base + "/realms/master/protocol/openid-connect/token",
                data=urlencode({
                    "grant_type": "password",
                    "client_id": "admin-cli",
                    "username": username,
                    "password": password,
                }).encode(),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            with opener.open(token_request, timeout=10) as response:
                token = json.load(response)["access_token"]

            smtp_server = build_smtp_server(os.environ)
            realm_payload = build_realm_payload(smtp_server)

            realm_request = Request(
                base + "/admin/realms/clinic",
                data=json.dumps(realm_payload).encode(),
                headers={
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json",
                },
                method="PUT",
            )
            with opener.open(realm_request, timeout=10):
                pass
            if smtp_server is not None:
                print("CLINICCARE_PASSWORD_RECOVERY_CONFIGURED")

            profile_provider = template.get("components", {}).get(
                "org.keycloak.userprofile.UserProfileProvider", []
            )
            if profile_provider:
                profile_config = profile_provider[0]["config"]["kc.user.profile.config"][0]
                profile_request = Request(
                    base + "/admin/realms/clinic/users/profile",
                    data=profile_config.encode(),
                    headers={
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json",
                    },
                    method="PUT",
                )
                with opener.open(profile_request, timeout=10):
                    pass

            ensure_profile_claim_mappers(opener, base, token, app_host=app_host)

            google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
            google_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
            if google_client_id and google_client_secret:
                configure_google_idp(opener, base, token, google_client_id, google_client_secret)
                print("CLINICCARE_GOOGLE_IDP_CONFIGURED")

            print("CLINICCARE_REGISTRATION_CONFIGURED")
            return
        except (HTTPError, URLError, TimeoutError, KeyError, json.JSONDecodeError):
            if attempt == 29:
                raise
            time.sleep(2)


if __name__ == "__main__":
    main()
