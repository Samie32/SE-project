$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    function New-Secret {
        $bytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $rng.Dispose()
        [Convert]::ToBase64String($bytes)
    }
    $values = @(
        "DB_PASSWORD=$(New-Secret)"
        "MYSQL_ROOT_PASSWORD=$(New-Secret)"
        "KEYCLOAK_ADMIN_PASSWORD=$(New-Secret)"
        "DEMO_PASSWORD=$(New-Secret)"
        "DATA_ENCRYPTION_KEY=$(New-Secret)"
    )
    [IO.File]::WriteAllLines($envPath, $values, (New-Object Text.UTF8Encoding $false))
}
$settings = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { $settings[$matches[1]] = $matches[2] }
}
$runtime = Join-Path $projectRoot 'infra/runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$realm = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'infra/keycloak/realm-template.json')
$realm = $realm.Replace('__DEMO_PASSWORD__', $settings['DEMO_PASSWORD'])
[IO.File]::WriteAllText((Join-Path $runtime 'clinic-realm.json'), $realm, (New-Object Text.UTF8Encoding $false))
Write-Output 'Local environment and demo realm ready. Secrets are stored in ignored .env.'
