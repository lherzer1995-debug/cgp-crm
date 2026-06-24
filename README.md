# CGP CRM – Railway + Clerk + API

## Required variables

Frontend build:
- `VITE_CLERK_PUBLISHABLE_KEY`

Backend runtime:
- `CLERK_SECRET_KEY`
- `APP_ADMIN_USER_IDS` comma-separated Clerk user IDs
- `APP_MANAGER_USER_IDS` optional
- `APP_TECHNICIAN_USER_IDS` optional
- `DATA_DIR` optional path for persistent workspace data, e.g. `/data`

## Local development

```bash
npm install
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
export CLERK_SECRET_KEY=sk_test_...
npm run dev
```

- Vite runs on `http://localhost:5173`
- API runs on `http://localhost:8080`
- Vite proxies `/api` to the API server

## Railway

Set:
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `APP_ADMIN_USER_IDS`
- `DATA_DIR=/data` if you mount a persistent volume

The Docker image builds the frontend and serves both SPA and API from the same service.
