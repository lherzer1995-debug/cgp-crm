# Railway deployment checklist

## 1. Required variables
Set these exact variables in Railway:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `APP_ADMIN_USER_IDS`
- `DATA_DIR=/data`

Do **not** use:
- `CLERK_PUBLISHABLE`
- `CLERK_PUBLISHABLE_KEY`

The frontend is built with Vite and only reads `VITE_CLERK_PUBLISHABLE_KEY`.

## 2. Persistent storage
Create a Railway Volume and mount it at:

`/data`

Then keep:

`DATA_DIR=/data`

Without this, your workspace JSON will not survive redeploys reliably.

## 3. Source-of-truth files
These files must be in GitHub on the exact branch Railway deploys:

- `Dockerfile`
- `package.json`
- `package-lock.json`
- `.npmrc`

If Railway logs still show:
- `node:22-alpine`
- `npm ci`
- `@clerk/... latest`

then Railway is building an older commit, wrong branch, or wrong root directory.

## 4. Health validation
After deploy, verify:

- `/`
- `/api/health`

`/api/health` must return JSON successfully. If the frontend opens but `/api/health` fails, the problem is server boot or Clerk runtime config.

## 5. Known value killers
Remove or avoid:
- `Caddyfile`
- Alpine base images for this project
- `npm ci` in the current broken lock/npm environment
- `latest` dependency versions
- internal/private registry URLs in `package-lock.json`

## 6. Smoke test
After deploy, test in this order:

1. Sign in with Clerk
2. Open dashboard
3. Create customer from `+ Neu`
4. Create task
5. Confirm task appears in calendar
6. Create service event
7. Reload page
8. Verify persisted data still exists

## 7. Red flags
If you see the setup fallback page again, the frontend build did not receive:

`VITE_CLERK_PUBLISHABLE_KEY`

If you see `Internal Server Error`, check:
- rotated `CLERK_SECRET_KEY`
- `/api/health`
- runtime logs after server start
