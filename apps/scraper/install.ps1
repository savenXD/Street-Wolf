# Street Wolf scraper installer for Windows (PowerShell). Safe to run again.
#   From the downloaded folder:   powershell -ExecutionPolicy Bypass -File install.ps1
#   Or in one go:                 irm <releases>/install.ps1 | iex
# No admin rights needed: if Node.js 20+ isn't installed it puts a private copy inside the scraper folder.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"   # Invoke-WebRequest is much faster without the progress bar

$NodeVersion = "v22.11.0"
$Releases = if ($env:SW_RELEASES) { $env:SW_RELEASES } else { "https://github.com/savenXD/Street-Wolf/releases/latest/download" }
$Target = if ($env:SW_HOME) { $env:SW_HOME } else { Join-Path $env:LOCALAPPDATA "street-wolf-scraper" }

function Say($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }

# 1. Where is the app? Next to this script when run from the folder, otherwise download it.
$Here = if ($PSScriptRoot) { $PSScriptRoot } else { $null }
if ($Here -and (Test-Path (Join-Path $Here "package.json")) -and (Select-String -Path (Join-Path $Here "package.json") -Pattern '"@street-wolf/scraper"' -Quiet)) {
  $App = $Here
} else {
  Say "Downloading the scraper to $Target"
  New-Item -ItemType Directory -Force -Path $Target | Out-Null
  $zip = Join-Path $env:TEMP "street-wolf-scraper.zip"
  Invoke-WebRequest "$Releases/street-wolf-scraper.zip" -OutFile $zip
  $tmp = Join-Path $env:TEMP "street-wolf-scraper-extract"
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  Expand-Archive $zip -DestinationPath $tmp -Force
  Copy-Item -Recurse -Force (Join-Path $tmp "street-wolf-scraper\*") $Target
  Remove-Item -Recurse -Force $tmp, $zip
  $App = $Target
}
Set-Location $App

# 2. Node.js 20 or newer.
$localNode = Join-Path $App ".node"
if (Test-Path (Join-Path $localNode "node.exe")) { $env:Path = "$localNode;$env:Path" }
function HaveNode { try { return ([int](node -p "process.versions.node.split('.')[0]")) -ge 20 } catch { return $false } }
if (HaveNode) {
  Say "Using Node.js $(node -v)"
} else {
  Say "Installing a private copy of Node.js $NodeVersion (no admin rights needed)"
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
  $nz = Join-Path $env:TEMP "node.zip"
  Invoke-WebRequest "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-$arch.zip" -OutFile $nz
  $nt = Join-Path $env:TEMP "node-extract"
  if (Test-Path $nt) { Remove-Item -Recurse -Force $nt }
  Expand-Archive $nz -DestinationPath $nt -Force
  if (Test-Path $localNode) { Remove-Item -Recurse -Force $localNode }
  Move-Item (Join-Path $nt "node-$NodeVersion-win-$arch") $localNode
  Remove-Item -Recurse -Force $nt, $nz
  $env:Path = "$localNode;$env:Path"
}

# 3. Libraries and the browser.
Say "Installing dependencies"
npm install --no-audit --no-fund --loglevel=error
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
Say "Downloading the browser (about 150 MB, one time)"
npx patchright install chromium
if ($LASTEXITCODE -ne 0) { throw "Browser download failed" }

# 4. Launchers you can double-click: background (no window) and window (you watch it work).
$run = '@echo off' + "`r`n" + 'setlocal' + "`r`n" + 'cd /d "%~dp0"' + "`r`n" + 'if exist ".node\node.exe" set "PATH=%~dp0.node;%PATH%"' + "`r`n" + 'call "%~dp0node_modules\.bin\tsx.cmd" "%~dp0src\cli.ts" %*' + "`r`n"
Set-Content -Path (Join-Path $App "street-wolf-scraper.cmd") -Value $run -Encoding ASCII
Set-Content -Path (Join-Path $App "start.cmd") -Value ('@echo off' + "`r`n" + 'call "%~dp0street-wolf-scraper.cmd" start' + "`r`n" + 'pause') -Encoding ASCII
Set-Content -Path (Join-Path $App "start-window.cmd") -Value ('@echo off' + "`r`n" + 'call "%~dp0street-wolf-scraper.cmd" start --headed' + "`r`n" + 'pause') -Encoding ASCII

# 5. Check it works, then connect it to your account.
Say "Checking the install"
& (Join-Path $App "street-wolf-scraper.cmd") doctor
if (-not $env:SW_SKIP_SETUP) {
  Say "Connect to your Street Wolf account"
  & (Join-Path $App "street-wolf-scraper.cmd") setup
}

Say "Done"
Write-Host "Start in the background (no window):  $App\start.cmd"
Write-Host "Start with a visible window:          $App\start-window.cmd"
Write-Host "Leave it running while you scrape from the dashboard."
