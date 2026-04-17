# New Local Machine Bootstrap

⚠️ **WINDOWS REQUIRED**: This application runs on Windows only. See [WINDOWS_DEPLOYMENT.md](WINDOWS_DEPLOYMENT.md) for platform requirements and constraints.

Use this checklist when setting up the app on a fresh Windows machine.

## Step 1: Clone and Install

```powershell
git clone <your-repo-url>
cd Build-Production-Ready-1
pnpm install
```

## Step 2: Setup Environment Files

Copy and edit:

- artifacts/api-server/.env.example -> artifacts/api-server/.env
- artifacts/intake-app/.env.example -> artifacts/intake-app/.env

PowerShell copy commands:

```powershell
Copy-Item .\artifacts\api-server\.env.example .\artifacts\api-server\.env
Copy-Item .\artifacts\intake-app\.env.example .\artifacts\intake-app\.env
```

Minimum values:

```env
# artifacts/api-server/.env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/janus_intake
LOG_LEVEL=info
```

If PostgreSQL on your machine requires a password, replace with:

```env
DATABASE_URL=postgresql://postgres:<your-password>@127.0.0.1:5432/janus_intake
```

```env
# artifacts/intake-app/.env
PORT=5173
BASE_PATH=/
VITE_API_BASE_URL=http://localhost:5000
```

## Step 3: Setup Local PostgreSQL

Create DB:

```sql
CREATE DATABASE janus_intake;
```

Set postgres password to match default local env:

```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

## Step 4: Apply Schema

```powershell
pnpm --filter ./lib/db run push
```

## Step 5: Run Apps

Terminal 1 (API):

```powershell
pnpm --filter ./artifacts/api-server run build
pnpm --filter ./artifacts/api-server run start
```

Terminal 2 (Frontend):

```powershell
pnpm --filter ./artifacts/intake-app run dev
```

## Step 6: Verify End-to-End

- API health: http://localhost:5000/api/healthz
- Frontend: http://localhost:5173
- Create one intake record and verify it appears in dashboard.

## Step 7: Optional Production Build Check

```powershell
pnpm run build
```

## Quick Automation Scripts (Windows)

Run the full first-time setup (expects local PostgreSQL password `data`):

```powershell
pnpm --filter @workspace/scripts run first-time-setup
```

Start backend and frontend in one click (opens 2 PowerShell windows):

```powershell
pnpm --filter @workspace/scripts run start-dev
```

Force-restart both services (kills current listeners on ports 5000 and 5173, then starts fresh):

```powershell
pnpm --filter @workspace/scripts run start-dev:force
```

## Windows Notes

- All setup commands in this guide are PowerShell-friendly.
- Use Windows Terminal or PowerShell 7+ for best compatibility.
