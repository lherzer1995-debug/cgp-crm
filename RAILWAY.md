# Railway Setup

## Required variables
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `APP_ADMIN_USER_IDS`
- `APP_MANAGER_USER_IDS`
- `APP_DISPATCHER_USER_IDS`
- `APP_TECHNICIAN_USER_IDS`
- `DATA_DIR=/data`

## Optional but recommended
- `DATABASE_URL` for Postgres persistence
- `PGSSL=require`

## Storage strategy
- Without `DATABASE_URL`, the app persists the workspace in `/data/workspace.json`
- With `DATABASE_URL`, the app persists the workspace in Postgres and keeps API logs in `api_logs`

## Health checks
- `/api/health`
- `/api/version`

## Production recommendation
Use Railway Postgres + a mounted `/data` volume as fallback storage during migration.
