# Run from any folder. Fail if the contract step cannot execute.
$ErrorActionPreference = 'Stop'
$Project = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
Push-Location $Project
try {
    $checks = @(
        @{Label='Fixture validator'; Args=@((Join-Path $PSScriptRoot 'validate_demo.py'))},
        @{Label='Unittest'; Args=@('-m','unittest','discover','-s',$PSScriptRoot,'-p','test_*.py','-v')},
        @{Label='OpenAPI catalog'; Args=@((Join-Path $PSScriptRoot 'validate_contract.py'))}
    )
    foreach ($check in $checks) {
        Write-Host ("=== " + $check.Label + " ===")
        $arguments = $check.Args
        & python @arguments
        if ($LASTEXITCODE -ne 0) { throw ("FAILED: " + $check.Label + ". Please install tools/requirements-contract.txt for OpenAPI validation.") }
    }
    Write-Host 'PASS: all static checks. NOT a MySQL/API integration result.'
} finally { Pop-Location }
