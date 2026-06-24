
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { WorkspaceStore } from './workspace-store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const dataDir = process.env.DATA_DIR || path.join(rootDir, '.data');
const port = Number(process.env.PORT || 8080);

const store = new WorkspaceStore(dataDir);
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(clerkMiddleware());

function deriveRole(userId) {
  const admins = (process.env.APP_ADMIN_USER_IDS || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  const managers = (process.env.APP_MANAGER_USER_IDS || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  const technicians = (process.env.APP_TECHNICIAN_USER_IDS || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  if (admins.includes(userId)) return 'admin';
  if (managers.includes(userId)) return 'manager';
  if (technicians.includes(userId)) return 'techniker';
  return 'dispatcher';
}

function getViewer(req) {
  const auth = getAuth(req);
  if (!auth.userId) return { userId: null, role: 'anonymous', name: 'Gast', email: '' };
  const claims = auth.sessionClaims || {};
  return {
    userId: auth.userId,
    role: deriveRole(auth.userId),
    name: claims.fullName || claims.full_name || claims.given_name || claims.email || auth.userId,
    email: claims.email || '',
  };
}

function requireApiAuth(req, res, next) {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Nicht authentifiziert.' });
  }
  return next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, runtime: 'railway-ready', updatedAt: new Date().toISOString() });
});

app.get('/api/bootstrap', requireApiAuth, (req, res) => {
  res.json(store.getSnapshot(getViewer(req)));
});

app.post('/api/actions', requireApiAuth, (req, res) => {
  try {
    const { action, payload } = req.body || {};
    const next = store.applyAction(action, payload || {}, getViewer(req));
    res.json({ ...next, viewer: getViewer(req) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Aktion konnte nicht verarbeitet werden.' });
  }
});

app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`CGP CRM server listening on :${port}`);
});
