
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = (
    Resolve-Path (
        Join-Path $PSScriptRoot '..'
    )
).Path

$checks = @(
    @{
        Name = 'Vitest'
        Arguments = @('run', 'test')
    },
    @{
        Name = 'Production build'
        Arguments = @('run', 'build')
    },
    @{
        Name = 'Oxlint'
        Arguments = @('run', 'lint')
    },
    @{
        Name = 'Source formatting'
        Arguments = @('run', 'format:check')
    },
    @{
        Name = 'Playwright and documentation formatting'
        Arguments = @(
            'exec', '--', 'prettier', '--check',
            'playwright*.config.ts',
            'e2e/**/*.{ts,md}',
            'src/ui/STAGE_4.md',
            'docs/STAGE_5_VALIDATION.md'
        )
    },
    @{
        Name = 'Development E2E'
        Arguments = @(
            'exec', '--', 'playwright', 'test'
        )
    },
    @{
        Name = 'Production E2E'
        Arguments = @(
            'exec', '--', 'playwright', 'test',
            '--config=playwright.production.config.ts'
        )
    },
    @{
        Name = 'Cross-browser development E2E'
        Arguments = @(
            'exec', '--', 'playwright', 'test',
            '--config=playwright.cross-browser.config.ts'
        )
    },
    @{
        Name = 'Cross-browser production E2E'
        Arguments = @(
            'exec', '--', 'playwright', 'test',
            '--config=playwright.production-cross-browser.config.ts'
        )
    },
    @{
        Name = 'Accessibility E2E'
        Arguments = @(
            'exec', '--', 'playwright', 'test',
            '--config=playwright.accessibility.config.ts'
        )
    },
    @{
        Name = 'Robustness E2E'
        Arguments = @(
            'exec', '--', 'playwright', 'test',
            '--config=playwright.robustness.config.ts'
        )
    }
)

$startedAt = Get-Date

Push-Location $projectRoot

try {
    $total = $checks.Count

    for ($index = 0; $index -lt $total; $index++) {
        $check = $checks[$index]
        $number = $index + 1

        Write-Host ''
        Write-Host "========================================"
        Write-Host "[$number/$total] $($check.Name)"
        Write-Host "========================================"

        [string[]]$commandArguments = $check.Arguments

        & npm.cmd @commandArguments

        if ($LASTEXITCODE -ne 0) {
            throw (
                "Verification failed: $($check.Name). " +
                "Exit code: $LASTEXITCODE"
            )
        }

        Write-Host "PASSED: $($check.Name)"
    }

    $elapsed = (Get-Date) - $startedAt

    Write-Host ''
    Write-Host '========================================'
    Write-Host 'STAGE 5 - ALL COMMANDS PASSED'
    Write-Host '========================================'
    Write-Host "Checks completed: $total"
    Write-Host (
        'Elapsed time: {0:N1} seconds' -f
        $elapsed.TotalSeconds
    )

    Write-Host ''
    Write-Host 'Review the suite totals above:'
    Write-Host 'Vitest: 489'
    Write-Host 'Development E2E: 15'
    Write-Host 'Production E2E: 17'
    Write-Host 'Cross-browser development: 51'
    Write-Host 'Cross-browser production: 51'
    Write-Host 'Accessibility: 17'
    Write-Host 'Robustness: 9'
}
catch {
    Write-Host ''
    Write-Host 'STAGE 5 - VERIFICATION FAILED'
    Write-Host $_.Exception.Message

    exit 1
}
finally {
    Pop-Location
}
