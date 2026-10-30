#Requires -Version 5.1
<#
.SYNOPSIS
  Download the latest open-next-yogseq CI artifact and deploy with local wrangler OAuth.

.EXAMPLE
  .\scripts\deploy-from-ci-artifact.ps1
  .\scripts\deploy-from-ci-artifact.ps1 -RunId 41109279660
#>
param(
  [long]$RunId = 0
)

$ErrorActionPreference = "Stop"
$Repo = "jigargor/yogseq"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $RepoRoot "apps\web"
$Tmp = Join-Path $env:TEMP "yogseq-open-next"

if ($RunId -eq 0) {
  $run = gh run list --repo $Repo --workflow CI --branch main --limit 20 --json databaseId,conclusion,status,displayTitle |
    ConvertFrom-Json |
    Where-Object { $_.status -eq "completed" } |
    Select-Object -First 1
  if (-not $run) { throw "No completed CI run found" }
  $RunId = $run.databaseId
  Write-Host "Using run $RunId ($($run.displayTitle))"
}

if (Test-Path $Tmp) { Remove-Item -Recurse -Force $Tmp }
New-Item -ItemType Directory -Path $Tmp | Out-Null

Write-Host "Downloading artifact open-next-yogseq from run $RunId ..."
gh run download $RunId --repo $Repo --name open-next-yogseq --dir $Tmp
if ($LASTEXITCODE -ne 0) { throw "gh run download failed — ensure the run uploaded open-next-yogseq" }

$openNextSrc = Join-Path $Tmp ".open-next"
if (-not (Test-Path $openNextSrc)) {
  $openNextSrc = Get-ChildItem -Path $Tmp -Recurse -Directory -Filter ".open-next" | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $openNextSrc) { throw "Could not find .open-next in artifact" }

$openNextDest = Join-Path $WebDir ".open-next"
if (Test-Path $openNextDest) { Remove-Item -Recurse -Force $openNextDest }
Copy-Item -Recurse -Force $openNextSrc $openNextDest

Set-Location $WebDir
pnpm exec wrangler whoami
if ($LASTEXITCODE -ne 0) { throw "Run: pnpm exec wrangler login" }

Write-Host "Deploying Worker yogseq ..."
pnpm exec wrangler deploy
if ($LASTEXITCODE -ne 0) { throw "wrangler deploy failed" }

Write-Host "Deployed. Set Worker secrets if needed (docs/metier-deploy.md §D)."
