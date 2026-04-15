$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

pnpm install --frozen-lockfile
pnpm --filter ./lib/db run push
