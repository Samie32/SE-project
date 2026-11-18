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

if git show-ref --verify --quiet refs/heads/main; then
  git switch main
  git merge --ff-only "$DEPLOY_SHA"
else
  git switch -c main "$DEPLOY_SHA"
fi
test "$(git rev-parse HEAD)" = "$DEPLOY_SHA"

compose() {
  docker compose --env-file .env.internet -f compose.yaml -f compose.internet.yaml "$@"
}

compose config --quiet
compose up -d --build
compose restart frontend

for attempt in $(seq 1 30); do
  if compose exec -T frontend wget -q -T 3 -O /dev/null http://backend:8080/actuator/health &&
     compose exec -T frontend wget -q -T 3 -O /dev/null http://127.0.0.1/health; then
    install -d -m 0755 /var/lib/cliniccare
    if ! cmp -s infra/internet/cliniccare-boot-deploy.service /etc/systemd/system/cliniccare-boot-deploy.service; then
      install -m 0644 infra/internet/cliniccare-boot-deploy.service /etc/systemd/system/
      systemctl daemon-reload
    fi
    if ! systemctl is-enabled --quiet cliniccare-boot-deploy.service; then
      systemctl enable cliniccare-boot-deploy.service
    fi
    systemctl is-enabled --quiet cliniccare-boot-deploy.service
    printf '%s\n' "$DEPLOY_SHA" > "$deployed_sha.tmp"
    mv "$deployed_sha.tmp" "$deployed_sha"
    printf 'CLINICCARE_BOOT_CHECK_ENABLED\n'
    printf 'CLINICCARE_DEPLOY_OK %s\n' "$DEPLOY_SHA"
    exit 0
  fi
  sleep 5
done

compose ps
echo "ClinicCare health checks timed out." >&2
exit 1
