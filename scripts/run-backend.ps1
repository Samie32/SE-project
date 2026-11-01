$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Get-Content -LiteralPath (Join-Path $projectRoot '.env') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') }
}
$env:SPRING_PROFILES_ACTIVE = 'demo'
$env:MIGRATION_USER = 'root'
$env:MIGRATION_PASSWORD = $env:MYSQL_ROOT_PASSWORD
Push-Location (Join-Path $projectRoot 'backend')
try { & .\mvnw.cmd spring-boot:run; if ($LASTEXITCODE -ne 0) { throw 'Backend failed' } }
finally { Pop-Location }
