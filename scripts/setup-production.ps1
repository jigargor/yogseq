#Requires -Version 5.1
<#
.SYNOPSIS
  Neon migrate + Cloudflare Worker secrets + first OpenNext deploy for yogseq.metierstudio.com.

.DESCRIPTION
  Required environment variables (set in the shell before running):
    DATABASE_URL              Neon pooled connection string
    BETTER_AUTH_SECRET        openssl rand -base64 32
    CLOUDFLARE_API_TOKEN      optional if `wrangler login` already done
    CLOUDFLARE_ACCOUNT_ID     optional with token

  Optional:
    RESEND_API_KEY, RESEND_FROM_EMAIL
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    NEXT_PUBLIC_CF_ANALYTICS_TOKEN

.EXAMPLE
  $env:DATABASE_URL = "postgresql://..."
  $env:BETTER_AUTH_SECRET = "..."
  .\scripts\setup-production.ps1
#>

$ErrorActionPreference = "Stop"
# Interim live host (.org zone is on Cloudflare). Flip to .com after NS cutover.
$ProductionOrigin = "https://yogseq.metierstudio.org"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $RepoRoot "apps\web"

function Require-Env([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

function Put-WorkerSecret([string]$Name, [string]$Value) {
  Write-Host "Setting Worker secret $Name ..."
  $Value | & pnpm exec wrangler secret put $Name
  if ($LASTEXITCODE -ne 0) { throw "wrangler secret put $Name failed" }
}

Set-Location $RepoRoot

$dbUrl = Require-Env "DATABASE_URL"
$authSecret = Require-Env "BETTER_AUTH_SECRET"

Write-Host "==> Installing dependencies"
pnpm install --frozen-lockfile

Write-Host "==> Migrating Neon database"
$env:DATABASE_URL = $dbUrl
pnpm db:migrate
if ($LASTEXITCODE -ne 0) { throw "db:migrate failed" }

Write-Host "==> Building pose catalog"
pnpm content:build
if ($LASTEXITCODE -ne 0) { throw "content:build failed" }

Set-Location $WebDir

Write-Host "==> Checking Cloudflare auth"
pnpm exec wrangler whoami
if ($LASTEXITCODE -ne 0) {
  throw "Not logged in to Cloudflare. Run: pnpm exec wrangler login   OR set CLOUDFLARE_API_TOKEN"
}

Write-Host "==> Deploying Worker (bake-time NEXT_PUBLIC_APP_URL=$ProductionOrigin)"
$env:NEXT_PUBLIC_APP_URL = $ProductionOrigin
$env:BETTER_AUTH_URL = $ProductionOrigin
$env:BETTER_AUTH_SECRET = $authSecret
$env:DATABASE_URL = $dbUrl
# Use `pnpm run deploy` — bare `pnpm deploy` is pnpm's publish command.
pnpm run deploy
if ($LASTEXITCODE -ne 0) { throw "pnpm run deploy failed" }

Write-Host "==> Publishing Worker runtime secrets"
Put-WorkerSecret "DATABASE_URL" $dbUrl
Put-WorkerSecret "BETTER_AUTH_SECRET" $authSecret
Put-WorkerSecret "BETTER_AUTH_URL" $ProductionOrigin

foreach ($optional in @(
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET"
)) {
  $val = [Environment]::GetEnvironmentVariable($optional)
  if (-not [string]::IsNullOrWhiteSpace($val)) {
    Put-WorkerSecret $optional $val
  }
}

Write-Host ""
Write-Host "Deploy complete."
Write-Host "Next: attach custom domain yogseq.metierstudio.com in the Cloudflare dashboard"
Write-Host "  Workers & Pages → yogseq → Settings → Domains & Routes → Add Custom Domain"
Write-Host "See docs/metier-deploy.md for GitHub secrets, rate limiting, and smoke tests."
