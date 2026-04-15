# Local DB Deployment Guide (Windows, End-to-End)

This is the complete deployment runbook for this application on a new Windows machine, from Git clone to fully running frontend + backend + local PostgreSQL.

---

## 1. What You Are Deploying

This repo contains:

- Frontend app: `artifacts/intake-app`
- Backend API: `artifacts/api-server`
- Shared DB schema (Drizzle): `lib/db`

Runtime flow:

1. Intake app runs on `http://localhost:5173`
2. API server runs on `http://localhost:5000`
3. API server reads/writes PostgreSQL database `janus_intake`

---

## 2. System Requirements (Windows)

- Windows 10 or 11
- PowerShell 5.1+ (PowerShell 7+ recommended)
- Git for Windows
- Node.js 20+ (Node 24 recommended)
- pnpm 9+
- PostgreSQL 14+

Recommended installation commands (PowerShell as Administrator):

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id PostgreSQL.PostgreSQL -e
npm install -g pnpm
```

Verify tools:

```powershell
git --version
node -v
pnpm -v
psql --version
```

---

## 3. Clone Repository

```powershell
Set-Location D:\
git clone <YOUR_GIT_REPO_URL>
Set-Location "D:\StrangerThings Season 5\Build-Production-Ready-1\Build-Production-Ready-1"
```

If your clone folder name differs, adjust the `Set-Location` path accordingly.

---

## 4. Install Node Dependencies

From workspace root:

```powershell
pnpm install
```

Expected: install completes without shell-script errors on Windows.

---

## 5. Setup PostgreSQL for This App

Open SQL shell (`psql`) as postgres superuser, then run:

```sql
ALTER USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE janus_intake;
```

If `janus_intake` already exists, skip database creation.

### Verify DB login

```powershell
psql "postgresql://postgres:postgres@127.0.0.1:5432/janus_intake" -c "select current_database();"
```

Expected result: `janus_intake`.

---

## 6. Configure Environment Files

From workspace root:

```powershell
Copy-Item .\artifacts\api-server\.env.example .\artifacts\api-server\.env -Force
Copy-Item .\artifacts\intake-app\.env.example .\artifacts\intake-app\.env -Force
```

### API env (`artifacts/api-server/.env`)

Use:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/janus_intake
LOG_LEVEL=info
```

If your local postgres password is different, replace the password in `DATABASE_URL`.

### Frontend env (`artifacts/intake-app/.env`)

Use:

```env
PORT=5173
BASE_PATH=/
VITE_API_BASE_URL=http://localhost:5000
```

---

## 7. Apply Schema to Local Database

From workspace root:

```powershell
pnpm --filter ./lib/db run push
```

Expected: schema is created/updated in local PostgreSQL.

---

## 8. Build Validation (Recommended Before Run)

```powershell
pnpm run build
```

Expected: full workspace build success.

---

## 9. Run Backend API

Terminal 1:

```powershell
Set-Location "D:\StrangerThings Season 5\Build-Production-Ready-1\Build-Production-Ready-1"
pnpm --filter ./artifacts/api-server run build
pnpm --filter ./artifacts/api-server run start
```

Expected log:

- `Server listening`
- `port: 5000`

Health check:

- Open `http://localhost:5000/api/healthz`
- Expected response: `{ "status": "ok" }`

---

## 10. Run Frontend Intake App

Terminal 2:

```powershell
Set-Location "D:\StrangerThings Season 5\Build-Production-Ready-1\Build-Production-Ready-1"
pnpm --filter ./artifacts/intake-app run dev
```

Open:

- `http://localhost:5173`

Login credentials in app:

- Username: `admin`
- Password: `janus@123`

---

## 11. Post-Deployment Functional Checklist

After login, verify:

1. New intake form saves data.
2. Dashboard loads records from DB.
3. Pagination starts with recent 100 and Load more data works.
4. Search returns records beyond first page.
5. Edit/Delete operations work and persist.

---

## 12. Optional One-Command Windows Helper

Runs install + DB push via PowerShell script:

```powershell
pnpm --filter ./scripts run post-merge:windows
```

---

## 13. Troubleshooting (Windows-Focused)

### A) API fails with DB auth error

Symptoms:

- `password authentication failed for user "postgres"`

Fix:

1. Update `DATABASE_URL` in `artifacts/api-server/.env`
2. Or set postgres password:

```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

### B) Frontend opens but API calls fail

Check:

1. API terminal is running on port 5000
2. `VITE_API_BASE_URL=http://localhost:5000` in `artifacts/intake-app/.env`

### C) `pnpm install` fails

Check:

1. `pnpm -v` works
2. You are in workspace root
3. Run PowerShell as normal user (or admin if required by policy)

### D) PostgreSQL command not found

Install PostgreSQL client tools or add PostgreSQL `bin` directory to PATH.

---

## 14. Production Notes for This Local Deployment

- This guide is for local machine deployment (single-node, localhost).
- Keep `.env` files private (already ignored by `.gitignore`).
- For client handover, provide:
  - this guide
  - `.env.example` files
  - DB backup/restore instructions (if existing data migration is needed)
