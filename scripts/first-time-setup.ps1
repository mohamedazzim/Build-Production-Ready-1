$ErrorActionPreference = "Stop"

$repoRoot = Join-Path $PSScriptRoot ".."
Set-Location $repoRoot

$apiEnvExample = Join-Path $repoRoot "artifacts/api-server/.env.example"
$apiEnv = Join-Path $repoRoot "artifacts/api-server/.env"
$appEnvExample = Join-Path $repoRoot "artifacts/intake-app/.env.example"
$appEnv = Join-Path $repoRoot "artifacts/intake-app/.env"

function Assert-CommandAvailable {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Ensure-EnvFile {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path $Destination)) {
    Copy-Item $Source $Destination
  }
}

function Set-Or-ReplaceEnvVar {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )

  $content = Get-Content $FilePath -Raw
  $pattern = "(?m)^${Key}=.*$"
  $replacement = "${Key}=${Value}"

  if ($content -match $pattern) {
    $content = [regex]::Replace($content, $pattern, $replacement)
  } else {
    if (-not $content.EndsWith("`n")) {
      $content += "`n"
    }
    $content += "$replacement`n"
  }

  Set-Content -Path $FilePath -Value $content -NoNewline
}

function Assert-LastCommandSucceeded {
  param([string]$Context)

  if ($LASTEXITCODE -ne 0) {
    throw "$Context failed with exit code $LASTEXITCODE."
  }
}

Write-Host "[1/6] Verifying toolchain..."
Assert-CommandAvailable "pnpm"

Write-Host "[2/6] Preparing environment files..."
Ensure-EnvFile -Source $apiEnvExample -Destination $apiEnv
Ensure-EnvFile -Source $appEnvExample -Destination $appEnv

Set-Or-ReplaceEnvVar -FilePath $apiEnv -Key "DATABASE_URL" -Value "postgresql://postgres:data@127.0.0.1:5432/janus_intake"
Set-Or-ReplaceEnvVar -FilePath $apiEnv -Key "LOCAL_DATABASE_URL" -Value "postgresql://postgres:data@127.0.0.1:5432/janus_intake"

Write-Host "[3/6] Ensuring local database exists..."
$env:PGPASSWORD = "data"

if (Get-Command "psql" -ErrorAction SilentlyContinue) {
  $dbExists = & psql -h 127.0.0.1 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='janus_intake';"
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to connect to local PostgreSQL. Make sure postgres is running and password is 'data'."
  }

  if ($dbExists.Trim() -ne "1") {
    & psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE janus_intake;"
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create database 'janus_intake'."
    }
  }
} else {
  # Fallback for systems without psql in PATH: use pg via workspace db package.
  $tmpNodeScript = Join-Path $repoRoot "lib/db/.tmp.ensure-db.cjs"
  @'
const pg = require("pg");

const adminUrl = "postgresql://postgres:data@127.0.0.1:5432/postgres";

async function ensureDb() {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();

  const result = await client.query("SELECT 1 FROM pg_database WHERE datname='janus_intake'");
  if (result.rowCount === 0) {
    await client.query("CREATE DATABASE janus_intake");
  }

  await client.end();
}

ensureDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
'@ | Set-Content -Path $tmpNodeScript -NoNewline

  pnpm --filter @workspace/db exec node $tmpNodeScript
  Remove-Item -Path $tmpNodeScript -Force -ErrorAction SilentlyContinue

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to connect to local PostgreSQL using password 'data'. Make sure service is running and credentials are correct."
  }
}

Write-Host "[4/6] Installing dependencies..."
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
  Write-Host "Frozen lockfile install failed. Retrying without --frozen-lockfile because workspace overrides changed..."
  pnpm install --no-frozen-lockfile
  Assert-LastCommandSucceeded -Context "Dependency installation"
}

Write-Host "[5/6] Applying schema..."
pnpm --filter ./lib/db run push
Assert-LastCommandSucceeded -Context "Database schema push"

Write-Host "[6/6] Running typecheck..."
pnpm run typecheck
Assert-LastCommandSucceeded -Context "Typecheck"

Write-Host "Setup complete. Use scripts/start-dev.ps1 to launch frontend and backend."
