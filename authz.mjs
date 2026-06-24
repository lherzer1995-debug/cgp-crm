
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { WorkspaceStore } from './workspace-store.mjs';
import { createWorkspaceRepository } from './db.mjs';
import { assertRole, canSeeActivityEntry, deriveRoleFromEnv, fail } from './authz.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT || 8080);
const startedAt = new Date().toISOString();
const version = process.env.APP_VERSION || '2026.06-audit';

const repository = createWorkspaceRepository();
const store = new WorkspaceStore(repository);
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(clerkMiddleware());

app.use(async (req, _res, next) => {
  req.requestId = `req_${Math.random().toString(36).slice(2, 10)}`;
  const auth = getAuth(req);
  req.viewer = auth?.userId ? {
    userId: auth.userId,
    role: deriveRoleFromEnv(auth.userId),
    name: auth.sessionClaims?.fullName || auth.sessionClaims?.full_name || auth.sessionClaims?.given_name || auth.sessionClaims?.email || auth.userId,
    email: auth.sessionClaims?.email || '',
  } : { userId: null, role: 'anonymous', name: 'Gast', email: '' };
  await repository.log({
    level: 'info',
    code: 'REQUEST',
    message: `${req.method} ${req.path}`,
    meta: { requestId: req.requestId, role: req.viewer.role, userId: req.viewer.userId },
  }).catch(() => {});
  next();
});

function requireApiAuth(req, _res, next) {
  if (!req.viewer?.userId) return next(fail(401, 'AUTH_REQUIRED', 'Nicht authentifiziert.'));
  next();
}

async function assertAuditScope(viewer, query) {
  if (viewer.role !== 'techniker') return;
  const workspace = await repository.readWorkspace();
  if (query.entityType === 'task' && query.entityId) {
    const task = workspace.customers.flatMap((customer) => customer.tasks).find((entry) => entry.id === query.entityId);
    if (!task || task.assignee !== viewer.name) throw fail(403, 'ROLE_FORBIDDEN', 'Diese Aufgabenhistorie ist für dich nicht freigegeben.');
    return;
  }
  if (query.entityType === 'service' && query.entityId) {
    const event = workspace.serviceEvents.find((entry) => entry.id === query.entityId);
    if (!event || event.assignee !== viewer.name) throw fail(403, 'ROLE_FORBIDDEN', 'Diese Einsatzhistorie ist für dich nicht freigegeben.');
    return;
  }
  if (query.customerId) {
    const hasAccess = workspace.serviceEvents.some((entry) => entry.customerId === query.customerId && entry.assignee === viewer.name)
      || workspace.customers.flatMap((customer) => customer.tasks).some((entry) => entry.customerId === query.customerId && entry.assignee === viewer.name);
    if (!hasAccess) throw fail(403, 'ROLE_FORBIDDEN', 'Diese Kundenhistorie ist für dich nicht freigegeben.');
  }
}


app.get('/api/health', async (_req, res, next) => {
  try {
    const storage = await repository.health();
    res.json({
      ok: storage.ok,
      version,
      runtime: 'railway-ready',
      storage,
      audit: {
        mode: storage.activityMode || 'embedded',
        storage: storage.auditStorage || storage.storage,
        count: storage.activityCount ?? null,
      },
      startedAt,
      now: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/version', (_req, res) => {
  res.json({ version, startedAt, runtime: 'node-express' });
});

app.get('/api/bootstrap', requireApiAuth, async (req, res, next) => {
  try {
    res.json(await store.getSnapshot(req.viewer));
  } catch (error) {
    next(error);
  }
});

app.get('/api/audit', requireApiAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 80), 250);
    const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
    const entityId = req.query.entityId ? String(req.query.entityId) : undefined;
    const customerId = req.query.customerId ? String(req.query.customerId) : undefined;
    await assertAuditScope(req.viewer, { entityType, entityId, customerId });
    const activity = await repository.listActivity({ entityType, entityId, customerId, limit });
    const visible = activity.filter((entry) => canSeeActivityEntry(req.viewer, entry));
    res.json({ items: visible, count: visible.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/logs', requireApiAuth, async (req, res, next) => {
  try {
    assertRole(req.viewer, ['admin', 'manager'], 'Diese Betriebslogs sind nur für Admin und Leitung freigegeben.');
    const limit = Math.min(Number(req.query.limit || 80), 200);
    const level = req.query.level ? String(req.query.level) : undefined;
    const items = await repository.listLogs({ level, limit });
    res.json({ items, count: items.length });
  } catch (error) {
    next(error);
  }
});

app.post('/api/actions', requireApiAuth, async (req, res, next) => {
  try {
    const { action, payload } = req.body || {};
    if (!action) throw fail(400, 'ACTION_REQUIRED', 'Aktion fehlt.');
    const nextState = await store.applyAction(action, payload || {}, req.viewer);
    res.json({ ...nextState, viewer: req.viewer });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.use(async (error, req, res, _next) => {
  const status = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'Interner Serverfehler.';
  await repository.log({
    level: status >= 500 ? 'error' : 'warning',
    code,
    message,
    meta: { requestId: req.requestId, path: req.path, method: req.method, role: req.viewer?.role, userId: req.viewer?.userId },
  }).catch(() => {});
  res.status(status).json({
    error: message,
    code,
    requestId: req.requestId,
  });
});

app.listen(port, () => {
  console.log(`CGP CRM server listening on :${port}`);
});
