# Run from any folder. Fail if the contract step cannot execute.
$ErrorActionPreference = 'Stop'
$Project = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
Push-Location $Project
try {
    Get-Command python -ErrorAction Stop | Out-Null
    $checks = @(
        @{Label='Fixture validator'; Args=@((Join-Path $PSScriptRoot 'validate_demo.py'))},
        @{Label='Unittest'; Args=@('-m','unittest','discover','-s',$PSScriptRoot,'-p','test_*.py','-v')},
        @{Label='Design OpenAPI catalog'; Args=@((Join-Path $PSScriptRoot 'validate_contract.py'))},
        @{Label='Implemented backend contract'; Args=@((Join-Path $PSScriptRoot 'backend_demo.py'),'--check')}
    )
    foreach ($check in $checks) {
        Write-Host ("=== " + $check.Label + " ===")
        $arguments = $check.Args
        # Python unittest ghi tiến độ lên stderr. PowerShell 5 có thể biến stderr
        # thành lỗi kết thúc khi redirect log cùng ErrorActionPreference=Stop.
        $previousPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            & python @arguments 2>&1 | ForEach-Object {
                if ($_ -is [System.Management.Automation.ErrorRecord]) { Write-Output $_.Exception.Message }
                else { Write-Output $_ }
            }
            $checkExitCode = $LASTEXITCODE
        } finally { $ErrorActionPreference = $previousPreference }
        if ($checkExitCode -ne 0) { throw ("FAILED: " + $check.Label + ". Please install tools/requirements-contract.txt for OpenAPI validation.") }
    }
    Write-Host 'PASS: all static checks. NOT a MySQL/API integration result.'
} finally { Pop-Location }
