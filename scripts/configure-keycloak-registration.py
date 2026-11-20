"""Configure realm email registration through the Keycloak Admin REST API."""

import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPHandler, ProxyHandler, Request, build_opener


def main():
    base = "http://keycloak:8080"
    username = os.environ["KC_BOOTSTRAP_ADMIN_USERNAME"]
    password = os.environ["KC_BOOTSTRAP_ADMIN_PASSWORD"]
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
                }).encode(),
                headers={
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json",
                },
                method="PUT",
            )
            with opener.open(realm_request, timeout=10):
                print("CLINICCARE_REGISTRATION_CONFIGURED")
                return
        except (HTTPError, URLError, TimeoutError, KeyError, json.JSONDecodeError):
            if attempt == 29:
                raise
            time.sleep(2)


if __name__ == "__main__":
    main()
