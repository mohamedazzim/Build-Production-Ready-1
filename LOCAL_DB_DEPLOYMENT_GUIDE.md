# Local DB Deployment Guide

This project now runs local-first with PostgreSQL by default.

## 1. Prerequisites

- Node.js 20+ (Node 24 recommended)
- pnpm 9+
- PostgreSQL 14+

## 2. Create Local PostgreSQL Database

Use any PostgreSQL client, or run:

```sql
CREATE DATABASE janus_intake;
```

To use the default connection string in this repo, set password for postgres user:

```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

If your local user/password are different, update your env file values accordingly.

## 3. Configure API Server Env

Create this file:

- artifacts/api-server/.env

Template:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/janus_intake
LOG_LEVEL=info
```

If your local PostgreSQL requires a password, use:

```env
DATABASE_URL=postgresql://postgres:<your-password>@127.0.0.1:5432/janus_intake
```

## 4. Configure Intake App Env (optional but recommended)

Create this file:

- artifacts/intake-app/.env

Template:

```env
PORT=5173
BASE_PATH=/
VITE_API_BASE_URL=http://localhost:5000
```

## 5. Install Dependencies

From workspace root:

```bash
pnpm install
```

## 6. Push Schema to Local DB

From workspace root:

```bash
pnpm --filter ./lib/db run push
```

## 7. Start API Server

From workspace root:

```bash
pnpm --filter ./artifacts/api-server run build
pnpm --filter ./artifacts/api-server run start
```

Server health check:

- http://localhost:5000/api/healthz

## 8. Start Intake Frontend

Open a second terminal at workspace root:

```bash
pnpm --filter ./artifacts/intake-app run dev
```

Open:

- http://localhost:5173

## 9. Local-Only Defaults Added in Code

- DB now auto-loads env from common local paths.
- DB falls back to:
  - postgresql://postgres:postgres@127.0.0.1:5432/janus_intake
- API server auto-loads artifacts/api-server/.env.
- Intake and sandbox Vite configs now have default local ports.

## 10. Troubleshooting

- If API fails with DB connection errors:
  - Confirm PostgreSQL service is running.
  - Confirm database janus_intake exists.
  - Confirm username/password in DATABASE_URL.
- If frontend cannot call API:
  - Confirm VITE_API_BASE_URL in artifacts/intake-app/.env points to the API host.
  - Confirm API is running on PORT from artifacts/api-server/.env.
- If schema push fails:
  - Recheck DATABASE_URL and database permissions.
