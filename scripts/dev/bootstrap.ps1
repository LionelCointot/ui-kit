# Prépare Node et .NET (installés dans le dossier utilisateur, sans droits administrateur) puis délègue à dev.mjs.
# Usage : powershell -NoProfile -ExecutionPolicy Bypass -File scripts\dev\bootstrap.ps1 <install|build|start|admin>
# Variables facultatives : SIMULATEUR_DEV_HOME (défaut %LOCALAPPDATA%\simulateur-dev), SIMULATEUR_DOTNET_DIR (défaut %LOCALAPPDATA%\Microsoft\dotnet).
param(
    [Parameter(Position = 0)]
    [ValidateSet('install', 'build', 'start', 'admin')]
    [string]$Command = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$NodeVersion = '24.22.2'
$NodeMinMajor = 24
$NodeMinMinor = 15
$DevHome = if ($env:SIMULATEUR_DEV_HOME) { $env:SIMULATEUR_DEV_HOME } else { Join-Path $env:LOCALAPPDATA 'simulateur-dev' }
$DotnetDir = if ($env:SIMULATEUR_DOTNET_DIR) { $env:SIMULATEUR_DOTNET_DIR } else { Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet' }
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Write-Step($Message) { Write-Host "`n==> $Message" -ForegroundColor Green }
function Write-Info($Message) { Write-Host "    $Message" }
function Stop-Script($Message) { Write-Host "`nERREUR : $Message" -ForegroundColor Red; exit 1 }

if (-not $Command) { Stop-Script 'Usage : bootstrap.ps1 <install|build|start|admin>' }

# Les TLS récents sont nécessaires pour nodejs.org et dot.net avec Windows PowerShell 5.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

function Test-NodeRecentEnough([string]$NodeExe) {
    try {
        $version = (& $NodeExe -p 'process.versions.node') -as [string]
        $parts = $version.Trim().Split('.')
        $major = [int]$parts[0]; $minor = [int]$parts[1]
        return ($major -gt $NodeMinMajor) -or ($major -eq $NodeMinMajor -and $minor -ge $NodeMinMinor)
    } catch { return $false }
}

function Install-Node {
    $arch = switch ($env:PROCESSOR_ARCHITECTURE) { 'ARM64' { 'arm64' } 'AMD64' { 'x64' } default { Stop-Script "Architecture non prise en charge ($env:PROCESSOR_ARCHITECTURE)." } }
    $name = "node-v$NodeVersion-win-$arch"
    $target = Join-Path $DevHome "node\$name"
    if (-not (Test-Path (Join-Path $target 'node.exe'))) {
        Write-Info "Téléchargement de Node v$NodeVersion (win-$arch) depuis nodejs.org…"
        $base = "https://nodejs.org/dist/v$NodeVersion"
        $work = Join-Path ([IO.Path]::GetTempPath()) ("simulateur-node-" + [Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $work | Out-Null
        $zip = Join-Path $work "$name.zip"
        Invoke-WebRequest -UseBasicParsing "$base/$name.zip" -OutFile $zip
        $sums = (Invoke-WebRequest -UseBasicParsing "$base/SHASUMS256.txt").Content
        $line = ($sums -split "`n") | Where-Object { $_ -match " $([regex]::Escape($name)).zip\s*$" } | Select-Object -First 1
        if (-not $line) { Stop-Script "Somme de contrôle introuvable pour $name.zip dans SHASUMS256.txt." }
        $expected = ($line.Trim() -split '\s+')[0].ToLowerInvariant()
        $actual = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
        if ($expected -ne $actual) { Stop-Script "Somme SHA-256 de Node incorrecte (attendue $expected, obtenue $actual). Téléchargement abandonné." }
        Write-Info 'Somme SHA-256 vérifiée.'
        New-Item -ItemType Directory -Force -Path (Join-Path $DevHome 'node') | Out-Null
        Expand-Archive -Path $zip -DestinationPath $work -Force
        if (Test-Path $target) { Remove-Item -Recurse -Force $target }
        Move-Item (Join-Path $work $name) $target
        Remove-Item -Recurse -Force $work
    }
    $env:PATH = "$target;$env:PATH"
}

function Test-Dotnet10([string]$DotnetExe) {
    try { return [bool]((& $DotnetExe --list-sdks 2>$null) -match '^10\.') } catch { return $false }
}

function Install-Dotnet {
    $work = Join-Path ([IO.Path]::GetTempPath()) ("simulateur-dotnet-" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $work | Out-Null
    Write-Info 'Téléchargement du script officiel dotnet-install (https://dot.net/v1/dotnet-install.ps1)…'
    $script = Join-Path $work 'dotnet-install.ps1'
    Invoke-WebRequest -UseBasicParsing 'https://dot.net/v1/dotnet-install.ps1' -OutFile $script
    Write-Info "Installation du SDK .NET 10 dans $DotnetDir (quelques minutes)…"
    & $script -Channel 10.0 -InstallDir $DotnetDir -NoPath
    Remove-Item -Recurse -Force $work
}

Write-Step "Node.js (version $NodeMinMajor.$NodeMinMinor ou plus récente)"
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd -and (Test-NodeRecentEnough $nodeCmd.Source)) {
    Write-Info "Node détecté : $($nodeCmd.Source)"
} else {
    Install-Node
    if (-not (Test-NodeRecentEnough (Get-Command node).Source)) { Stop-Script 'Node installé mais inutilisable.' }
    Write-Info 'Node prêt (dossier utilisateur).'
}

Write-Step 'SDK .NET 10'
$dotnetCmd = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnetCmd -and (Test-Dotnet10 $dotnetCmd.Source)) {
    Write-Info "SDK .NET détecté : $($dotnetCmd.Source)"
} else {
    $localDotnet = Join-Path $DotnetDir 'dotnet.exe'
    if (-not ((Test-Path $localDotnet) -and (Test-Dotnet10 $localDotnet))) { Install-Dotnet }
    if (-not (Test-Dotnet10 $localDotnet)) { Stop-Script "Le SDK .NET 10 n'est pas utilisable dans $DotnetDir." }
    $env:DOTNET_ROOT = $DotnetDir
    $env:PATH = "$DotnetDir;$env:PATH"
    Write-Info "SDK .NET prêt : $DotnetDir"
}
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'

Set-Location $Root
if ($Command -eq 'admin') {
    if (-not (Test-Path 'scripts/dev/admin.mjs')) { Stop-Script "Le panneau des serveurs n'existe que dans finance-hub." }
    Write-Step 'node scripts/dev/admin.mjs'
    & node scripts/dev/admin.mjs
    exit $LASTEXITCODE
}
Write-Step "node scripts/dev/dev.mjs $Command"
& node scripts/dev/dev.mjs $Command
exit $LASTEXITCODE
