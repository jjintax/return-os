param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

if (-not (Test-Path ".git")) {
  throw "Git repository not found."
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  throw "origin remote not found."
}

git add .
$status = git status --short

if ($status) {
  if (-not $Message) {
    $Message = "Update Return OS " + (Get-Date -Format "yyyy-MM-dd HH:mm")
  }
  git commit -m $Message
} else {
  Write-Host "No local changes"
}

git pull --rebase origin main
git push origin main

Write-Host "Done: GitHub updated"
Write-Host $remote
