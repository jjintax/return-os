$ErrorActionPreference = "SilentlyContinue"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 4181
$DataDir = Join-Path $ProjectRoot "data"
$NodeExe = "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$OutLog = Join-Path $ProjectRoot "return-os-server.out.log"
$ErrLog = Join-Path $ProjectRoot "return-os-server.err.log"
$PidFile = Join-Path $ProjectRoot "return-os-server.pid"

Set-Location $ProjectRoot

function Test-ReturnOsPort {
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return $null -ne $listener
}

while ($true) {
  if (Test-ReturnOsPort) {
    Start-Sleep -Seconds 5
    continue
  }

  $env:PORT = [string]$Port
  $env:DATA_DIR = $DataDir
  $process = Start-Process -FilePath $NodeExe -ArgumentList "server.js" -WorkingDirectory $ProjectRoot -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog -PassThru
  Set-Content -Path $PidFile -Value $process.Id
  Wait-Process -Id $process.Id
  Start-Sleep -Seconds 2
}
