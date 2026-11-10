
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (
    Resolve-Path (
        Join-Path $PSScriptRoot '..'
    )
).Path

Push-Location $root

try {
    Write-Host ''
    Write-Host '========================================'
    Write-Host 'WORKFLOW INSPECTOR - RELEASE PREFLIGHT'
    Write-Host '========================================'

    $requiredPaths = @(
        'package.json',
        'package-lock.json',
        'index.html',
        'src',
        'e2e',
        'scripts/verify-stage5.ps1',
        'docs/STAGE_5_VALIDATION.md',
        'dist/index.html',
        'dist/assets'
    )

    Write-Host ''
    Write-Host '[1/5] Required project files'

    foreach ($path in $requiredPaths) {
        if (-not (Test-Path $path)) {
            throw "Missing required path: $path"
        }

        Write-Host "OK: $path"
    }

    Write-Host ''
    Write-Host '[2/5] Package metadata'

    $package = Get-Content 'package.json' -Raw |
        ConvertFrom-Json

    if ([string]::IsNullOrWhiteSpace(
        [string]$package.name
    )) {
        throw 'package.json does not declare a name'
    }

    if ([string]::IsNullOrWhiteSpace(
        [string]$package.version
    )) {
        throw 'package.json does not declare a version'
    }

    Write-Host "Name: $($package.name)"
    Write-Host "Version: $($package.version)"

    $privateProperty =
        $package.PSObject.Properties['private']

    if ($null -ne $privateProperty) {
        Write-Host "Private: $($privateProperty.Value)"
    }
    else {
        Write-Host 'Private: not declared'
    }

    $licenseProperty =
        $package.PSObject.Properties['license']

    if ($null -ne $licenseProperty) {
        Write-Host "License metadata: $($licenseProperty.Value)"
    }
    else {
        Write-Host 'License metadata: not declared'
    }

    $requiredScripts = @(
        'dev',
        'build',
        'test',
        'lint',
        'format:check'
    )

    if ($null -eq $package.scripts) {
        throw 'package.json does not declare scripts'
    }

    $availableScripts =
        @($package.scripts.PSObject.Properties.Name)

    foreach ($scriptName in $requiredScripts) {
        if ($availableScripts -notcontains $scriptName) {
            throw "Missing npm script: $scriptName"
        }

        Write-Host "Script OK: $scriptName"
    }

    Write-Host ''
    Write-Host '[3/5] Compiled distribution'

    $html = Get-Content 'dist/index.html' -Raw

    if (
        $html.Contains('/@vite/client') -or
        $html.Contains('/src/main.tsx')
    ) {
        throw 'Development resources found in dist/index.html'
    }

    $javascriptFiles = @(
        Get-ChildItem 'dist/assets' -File -Filter '*.js'
    )

    $cssFiles = @(
        Get-ChildItem 'dist/assets' -File -Filter '*.css'
    )

    if ($javascriptFiles.Count -eq 0) {
        throw 'No compiled JavaScript assets found'
    }

    if ($cssFiles.Count -eq 0) {
        throw 'No compiled CSS assets found'
    }

    Write-Host "JavaScript assets: $($javascriptFiles.Count)"
    Write-Host "CSS assets: $($cssFiles.Count)"

    foreach ($asset in ($javascriptFiles + $cssFiles)) {
        Write-Host (
            "Asset: {0} ({1} bytes)" -f
            $asset.Name, $asset.Length
        )
    }

    Write-Host ''
    Write-Host '[4/5] Documentation and exclusions'

    foreach ($optionalPath in @(
        'README.md',
        'LICENSE',
        'LICENSE.md',
        '.gitignore'
    )) {
        if (Test-Path $optionalPath) {
            Write-Host "Present: $optionalPath"
        }
        else {
            Write-Host "Not present: $optionalPath"
        }
    }

    if (Test-Path '.gitignore') {
        $ignoreText = Get-Content '.gitignore' -Raw

        if (
            $ignoreText -notmatch
            '(?m)^\s*/?node_modules/?\s*$'
        ) {
            Write-Warning (
                'Review .gitignore: node_modules ' +
                'may not be excluded'
            )
        }

        if (
            $ignoreText -notmatch
            '(?m)^\s*/?dist/?\s*$'
        ) {
            Write-Warning (
                'Review .gitignore: dist ' +
                'may not be excluded'
            )
        }
    }

    Write-Host ''
    Write-Host '[5/5] Git working tree'

    $gitCommand = Get-Command git -ErrorAction SilentlyContinue

    if (
        $null -ne $gitCommand -and
        (Test-Path '.git')
    ) {
        Write-Host 'Git repository detected'
        Write-Host 'Current changes:'

        & git status --short

        if ($LASTEXITCODE -ne 0) {
            throw 'Unable to inspect Git status'
        }
    }
    else {
        Write-Host (
            'Git repository not detected here, ' +
            'or Git is unavailable'
        )
    }

    Write-Host ''
    Write-Host '========================================'
    Write-Host 'RELEASE PREFLIGHT PASSED'
    Write-Host '========================================'
    Write-Host (
        'Technical inventory complete. ' +
        'Release metadata and distribution ' +
        'policy still require review.'
    )
}
catch {
    Write-Host ''
    Write-Host 'RELEASE PREFLIGHT FAILED'
    Write-Host $_.Exception.Message
    exit 1
}
finally {
    Pop-Location
}
