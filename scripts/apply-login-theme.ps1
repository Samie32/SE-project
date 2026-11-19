param(
    [string]$ProjectName,
    [switch]$EnableRegistration
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    $composeArgs = @()
    if ($ProjectName) { $composeArgs = @('-p', $ProjectName) }
    if ($EnableRegistration) {
        $realm = Get-Content -LiteralPath 'infra/keycloak/realm-template.json' -Raw -Encoding UTF8 | ConvertFrom-Json
        $profile = $realm.components.'org.keycloak.userprofile.UserProfileProvider'[0].config.'kc.user.profile.config'[0]
        $profileCommand = @'
/opt/keycloak/bin/kcadm.sh update users/profile -r clinic --no-config --server http://localhost:8080 --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" -f /dev/stdin
'@
        # Send ASCII JSON so Windows PowerShell preserves Vietnamese labels on stdin.
        $profile = [regex]::Replace($profile, '[^\u0000-\u007F]', { param($match) '\u{0:x4}' -f [int][char]$match.Value })
        $profile | docker compose @composeArgs exec -T keycloak sh -c $profileCommand
        if ($LASTEXITCODE -ne 0) { throw 'Could not apply ClinicCare registration profile.' }
    }
    # Credentials are expanded inside the container, never copied into host command arguments.
    $command = @'
/opt/keycloak/bin/kcadm.sh update realms/clinic --no-config --server http://localhost:8080 --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" -s loginTheme=cliniccare -s rememberMe=true
'@
    if ($EnableRegistration) {
        $command += " -s registrationAllowed=true -s loginWithEmailAllowed=true -s 'passwordPolicy=length(8)'"
    }
    docker compose @composeArgs exec -T keycloak sh -c $command
    if ($LASTEXITCODE -ne 0) { throw 'Could not apply ClinicCare login theme.' }
    Write-Output 'ClinicCare login theme applied. Accounts and application data unchanged.'
} finally {
    Pop-Location
}
