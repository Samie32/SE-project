$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    # Credentials are expanded inside the container, never copied into host command arguments.
    $command = @'
/opt/keycloak/bin/kcadm.sh update realms/clinic --no-config --server http://localhost:8080 --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" -s loginTheme=cliniccare -s rememberMe=true
'@
    docker compose exec -T keycloak sh -c $command
    if ($LASTEXITCODE -ne 0) { throw 'Could not apply ClinicCare login theme.' }
    Write-Output 'ClinicCare login theme applied. Accounts and application data unchanged.'
} finally {
    Pop-Location
}
