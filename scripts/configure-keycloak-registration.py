"""Configure realm email registration through the Keycloak Admin REST API."""

import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPHandler, ProxyHandler, Request, build_opener


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

            realm_request = Request(
                base + "/admin/realms/clinic",
                data=json.dumps({
                    "loginTheme": "cliniccare",
                    "rememberMe": True,
                    "registrationAllowed": True,
                    "registrationEmailAsUsername": True,
                    "loginWithEmailAllowed": True,
                    "editUsernameAllowed": False,
                    "duplicateEmailsAllowed": False,
                    "passwordPolicy": "length(8)",
                }).encode(),
                headers={
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json",
                },
                method="PUT",
            )
            with opener.open(realm_request, timeout=10):
                pass

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

            if app_host:
                origin = "https://" + app_host
                clients_request = Request(
                    base + "/admin/realms/clinic/clients?clientId=clinic-web",
                    headers={"Authorization": "Bearer " + token},
                )
                with opener.open(clients_request, timeout=10) as response:
                    clients = json.load(response)
                if len(clients) == 1:
                    client = clients[0]
                    client["redirectUris"] = [origin + "/callback"]
                    client["webOrigins"] = [origin]
                    client["attributes"]["post.logout.redirect.uris"] = origin + "/login?loggedout=1"
                    update_request = Request(
                        base + "/admin/realms/clinic/clients/" + client["id"],
                        data=json.dumps(client).encode(),
                        headers={
                            "Authorization": "Bearer " + token,
                            "Content-Type": "application/json",
                        },
                        method="PUT",
                    )
                    with opener.open(update_request, timeout=10):
                        pass

            print("CLINICCARE_REGISTRATION_CONFIGURED")
            return
        except (HTTPError, URLError, TimeoutError, KeyError, json.JSONDecodeError):
            if attempt == 29:
                raise
            time.sleep(2)


if __name__ == "__main__":
    main()
