# Runs on the Azure VM through RunShellScript. DEPLOY_SHA comes from the CI run.
set -eu
cd /opt/cliniccare

: "${DEPLOY_SHA:?DEPLOY_SHA is required}"
case "$DEPLOY_SHA" in
  *[!0-9a-f]*) echo "Invalid deploy SHA" >&2; exit 1 ;;
esac
test "${#DEPLOY_SHA}" -eq 40

exec 9>/var/lock/cliniccare-deploy.lock
flock -n 9

git fetch origin refs/heads/main
if [ "$(git rev-parse FETCH_HEAD)" != "$DEPLOY_SHA" ]; then
  printf 'CLINICCARE_DEPLOY_SUPERSEDED %s\n' "$DEPLOY_SHA"
  exit 0
fi

deployed_sha=/var/lib/cliniccare/deployed-sha
if [ "${SKIP_IF_DEPLOYED:-0}" = 1 ] && [ -f "$deployed_sha" ] && [ "$(cat "$deployed_sha")" = "$DEPLOY_SHA" ]; then
  printf 'CLINICCARE_DEPLOY_OK %s\n' "$DEPLOY_SHA"
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "The deployment checkout has local changes." >&2
  exit 1
fi

pending_deploy=/var/lib/cliniccare/deploy-pending
mode=full
if [ "${DEPLOY_FORCE_FULL:-0}" != 1 ] && [ -f "$deployed_sha" ] && [ ! -e "$pending_deploy" ]; then
  deployed_commit=$(cat "$deployed_sha")
  if git merge-base --is-ancestor "$deployed_commit" "$DEPLOY_SHA"; then
    if git diff --quiet "$deployed_commit" "$DEPLOY_SHA" -- . ':(exclude)docs/' ':(exclude)README.md'; then
      mode=docs-only
    elif git diff --quiet "$deployed_commit" "$DEPLOY_SHA" -- . ':(exclude)docs/' ':(exclude)README.md' ':(exclude)frontend/'; then
      mode=frontend-only
    fi
  fi
fi

if git show-ref --verify --quiet refs/heads/main; then
  git switch main
  git merge --ff-only "$DEPLOY_SHA"
else
  git switch -c main "$DEPLOY_SHA"
fi
test "$(git rev-parse HEAD)" = "$DEPLOY_SHA"

printf 'CLINICCARE_DEPLOY_MODE %s %s\n' "$mode" "$DEPLOY_SHA"
record_deployment() {
  printf '%s\n' "$DEPLOY_SHA" > "$deployed_sha.tmp"
  mv "$deployed_sha.tmp" "$deployed_sha"
  rm -f "$pending_deploy"
  printf 'CLINICCARE_DEPLOY_OK %s\n' "$DEPLOY_SHA"
}

if [ "$mode" = docs-only ]; then
  record_deployment
  exit 0
fi

compose() {
  docker compose --env-file .env.internet -f compose.yaml -f compose.internet.yaml "$@"
}

compose config --quiet
install -d -m 0755 /var/lib/cliniccare
touch "$pending_deploy"
if [ "$mode" = frontend-only ]; then
  compose up -d --build --no-deps frontend
  app_host=$(compose exec -T gateway printenv APP_HOST)
else
  python3 scripts/run-with-azure-smtp.py docker compose --env-file .env.internet \
    -f compose.yaml -f compose.internet.yaml up -d --build
  compose restart frontend
fi

configure_keycloak_registration() {
  if compose run --rm auth-config | grep -Fxq "CLINICCARE_REGISTRATION_CONFIGURED"; then
    printf 'CLINICCARE_REGISTRATION_CONFIGURED\n'
    return 0
  fi
  echo "Could not enable Keycloak email registration." >&2
  return 1
}

configure_keycloak_registration

frontend_https_ready() {
  curl --fail --silent --show-error --max-time 5 \
    --resolve "$app_host:443:127.0.0.1" -o /dev/null "https://$app_host/" &&
  [ "$(curl --silent --show-error --max-time 5 \
    --resolve "$app_host:443:127.0.0.1" -o /dev/null -w '%{http_code}' \
    "https://$app_host/api/me/profile")" = 401 ]
}

for attempt in $(seq 1 30); do
  if compose exec -T frontend wget -q -T 3 -O /dev/null http://backend:8080/actuator/health &&
     compose exec -T frontend wget -q -T 3 -O /dev/null http://127.0.0.1/health &&
     { [ "$mode" != frontend-only ] || frontend_https_ready; }; then
    if ! cmp -s infra/internet/cliniccare-boot-deploy.service /etc/systemd/system/cliniccare-boot-deploy.service; then
      install -m 0644 infra/internet/cliniccare-boot-deploy.service /etc/systemd/system/
      systemctl daemon-reload
    fi
    if ! systemctl is-enabled --quiet cliniccare-boot-deploy.service; then
      systemctl enable cliniccare-boot-deploy.service
    fi
    systemctl is-enabled --quiet cliniccare-boot-deploy.service
    printf 'CLINICCARE_BOOT_CHECK_ENABLED\n'
    record_deployment
    exit 0
  fi
  sleep 5
done

compose ps
echo "ClinicCare health checks timed out." >&2
exit 1
