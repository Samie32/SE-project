param([switch]$SkipInfrastructure)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) {
    & (Join-Path $PSScriptRoot 'setup-local.ps1')
}
if (-not $SkipInfrastructure) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker is required. Start Docker Desktop or use -SkipInfrastructure with an existing MySQL, OIDC and SMTP environment.'
    }
    & docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop, then run this script again.' }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'infra/runtime/clinic-realm.json'))) {
        & (Join-Path $PSScriptRoot 'setup-local.ps1')
    }
    Push-Location $projectRoot
    try {
        # Windows PowerShell 5 treats native stderr progress as an error when redirected.
        $ErrorActionPreference = 'Continue'
        & docker compose up -d --wait mysql keycloak mailpit
        $ErrorActionPreference = 'Stop'
        if ($LASTEXITCODE -ne 0) { throw 'Backend infrastructure failed to start.' }
    }
    finally { $ErrorActionPreference = 'Stop'; Pop-Location }
}
Get-Content -LiteralPath (Join-Path $projectRoot '.env') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') }
}
$env:SPRING_PROFILES_ACTIVE = 'demo'
$env:MIGRATION_USER = 'root'
$env:MIGRATION_PASSWORD = $env:MYSQL_ROOT_PASSWORD
Write-Output 'Starting API at http://localhost:8080; Swagger UI: http://localhost:8080/swagger-ui/index.html'
Push-Location (Join-Path $projectRoot 'backend')
try {
    $ErrorActionPreference = 'Continue'
    & .\mvnw.cmd spring-boot:run
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw 'Backend failed' }
}
finally { $ErrorActionPreference = 'Stop'; Pop-Location }
