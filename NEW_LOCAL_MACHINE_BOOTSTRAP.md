# New Local Machine Bootstrap

Use this checklist when setting up the app on a fresh machine.

## Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd Build-Production-Ready-1
pnpm install
```

## Step 2: Setup Environment Files

Copy and edit:

- artifacts/api-server/.env.example -> artifacts/api-server/.env
- artifacts/intake-app/.env.example -> artifacts/intake-app/.env

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

```bash
pnpm --filter ./lib/db run push
```

## Step 5: Run Apps

Terminal 1 (API):

```bash
pnpm --filter ./artifacts/api-server run build
pnpm --filter ./artifacts/api-server run start
```

Terminal 2 (Frontend):

```bash
pnpm --filter ./artifacts/intake-app run dev
```

## Step 6: Verify End-to-End

- API health: http://localhost:5000/api/healthz
- Frontend: http://localhost:5173
- Create one intake record and verify it appears in dashboard.

## Step 7: Optional Production Build Check

```bash
pnpm run build
```
