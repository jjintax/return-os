param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

if (-not (Test-Path ".git")) {
  throw "Git 저장소가 없어요."
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  throw "origin 원격 저장소가 없어요."
}

git pull --rebase origin main
git add .

$status = git status --short
if (-not $status) {
  Write-Host "변경 없음"
  exit 0
}

if (-not $Message) {
  $Message = "Update Return OS " + (Get-Date -Format "yyyy-MM-dd HH:mm")
}

git commit -m $Message
git push origin main

Write-Host "완료: GitHub 반영"
Write-Host $remote
