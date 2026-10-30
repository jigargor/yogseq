#Requires -Version 5.1
<#
.SYNOPSIS
  Configure GitHub Actions secrets/variables for Cloudflare production deploys.

.DESCRIPTION
  Requires `gh` authenticated to jigargor/yogseq with repo + workflow scopes.

  Required environment variables:
    CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID
    BETTER_AUTH_SECRET
    DATABASE_URL

  Optional:
    NEXT_PUBLIC_CF_ANALYTICS_TOKEN
    RESEND_API_KEY / RESEND_FROM_EMAIL (documented only — Worker secrets via Wrangler)

.EXAMPLE
  $env:CLOUDFLARE_API_TOKEN = "..."
  $env:CLOUDFLARE_ACCOUNT_ID = "..."
  $env:BETTER_AUTH_SECRET = "..."
  $env:DATABASE_URL = "..."
  .\scripts\setup-github-secrets.ps1
#>

$ErrorActionPreference = "Stop"
# Interim live host (.org zone is on Cloudflare). Flip to .com after NS cutover.
$ProductionOrigin = "https://yogseq.metierstudio.org"
$Repo = "jigargor/yogseq"

function Require-Env([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

function Set-RepoSecret([string]$Name, [string]$Value) {
  Write-Host "Setting secret $Name"
  $Value | gh secret set $Name --repo $Repo
  if ($LASTEXITCODE -ne 0) { throw "gh secret set $Name failed" }
}

gh auth status
if ($LASTEXITCODE -ne 0) { throw "gh is not authenticated" }

$cfToken = Require-Env "CLOUDFLARE_API_TOKEN"
$cfAccount = Require-Env "CLOUDFLARE_ACCOUNT_ID"
$authSecret = Require-Env "BETTER_AUTH_SECRET"
$dbUrl = Require-Env "DATABASE_URL"

Set-RepoSecret "CLOUDFLARE_API_TOKEN" $cfToken
Set-RepoSecret "CLOUDFLARE_ACCOUNT_ID" $cfAccount
Set-RepoSecret "BETTER_AUTH_SECRET" $authSecret
Set-RepoSecret "BETTER_AUTH_URL" $ProductionOrigin
Set-RepoSecret "DATABASE_URL" $dbUrl

$analytics = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_CF_ANALYTICS_TOKEN")
if (-not [string]::IsNullOrWhiteSpace($analytics)) {
  Set-RepoSecret "NEXT_PUBLIC_CF_ANALYTICS_TOKEN" $analytics
}

Write-Host "Setting variable NEXT_PUBLIC_APP_URL=$ProductionOrigin"
gh variable set NEXT_PUBLIC_APP_URL --repo $Repo --body $ProductionOrigin
if ($LASTEXITCODE -ne 0) { throw "gh variable set NEXT_PUBLIC_APP_URL failed" }

Write-Host ""
Write-Host "GitHub Actions secrets/variables configured for $Repo."
Write-Host "Reminder: Worker runtime secrets are separate — run scripts/setup-production.ps1 or wrangler secret put."
