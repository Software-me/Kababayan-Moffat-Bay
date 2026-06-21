# Publish Loreine's Bay Resort Lodge to GitHub + Render
#
# Prerequisites (one time):
#   1. winget install GitHub.cli   (already installed)
#   2. gh auth login               (sign in to GitHub in browser)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/publish.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$repoName = "LoreineResortBayLodge"
$repoOwner = "Software-me"

Write-Host "`n=== Loreine's Bay — GitHub + Render publish ===`n"

# Ensure gh is on PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub CLI is not signed in.`n"
  Write-Host "Run:  gh auth login`n"
  Write-Host "Then run this script again.`n"
  exit 1
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  Write-Host "Creating GitHub repo: $repoName ..."
  gh repo create $repoName --public --source=. --remote=origin --description "Loreine's Bay Resort Lodge — full-stack reservation web app (Node.js + PostgreSQL)"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Repo create failed. If the name is taken, rename in this script or create the repo manually on GitHub."
    exit 1
  }
} else {
  Write-Host "Remote already configured: $remote"
}

Write-Host "Pushing to origin main ..."
git push -u origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "Push failed."
  exit 1
}

$repoUrl = gh repo view --json url -q .url
Write-Host "`nGitHub repo: $repoUrl"

Write-Host @"

=== Next: connect Render (one time) ===

1. Open: https://dashboard.render.com/select-repo?type=blueprint
2. Sign in with GitHub and select: $repoName
3. Click Apply — Render reads render.yaml and creates:
   - Web service (auto-deploys on every push to main)
   - PostgreSQL database
4. Wait ~3–5 minutes for the first deploy.
5. Your live URL will appear in the Render dashboard.

Demo logins on the live site: demo/demo and admin/admin

"@

Start-Process "https://dashboard.render.com/select-repo?type=blueprint"
