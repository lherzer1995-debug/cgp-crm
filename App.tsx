
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { defaultSettings, seedActivity, seedCustomers, seedServiceEvents, team } from './default-workspace.mjs';

const { Pool } = pg;
const WORKSPACE_KEY = 'primary';
const DEFAULT_ACTIVITY_LIMIT = 160;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultWorkspace() {
  return {
    settings: clone(defaultSettings),
    customers: clone(seedCustomers),
    serviceEvents: clone(seedServiceEvents),
    activity: clone(seedActivity),
    team: clone(team),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeActivityRow(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    detail: row.detail,
    customerId: row.customer_id,
    customerName: row.customer_name,
    timestamp: row.timestamp,
    actor: row.actor,
    entityType: row.entity_type || undefined,
    entityId: row.entity_id || undefined,
    handoffTo: row.handoff_to || undefined,
    visibility: row.visibility || 'all',
  };
}

function sortActivity(entries) {
  return [...entries].sort((left, right) => {
    const a = Date.parse(String(left.timestamp).replace(' ', 'T').replace(',', ''));
    const b = Date.parse(String(right.timestamp).replace(' ', 'T').replace(',', ''));
    return (Number.isNaN(b) ? 0 : b) - (Number.isNaN(a) ? 0 : a);
  });
}

export function createWorkspaceRepository() {
  if (process.env.DATABASE_URL) {
    return new PostgresWorkspaceRepository(process.env.DATABASE_URL);
  }
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), '.data');
  return new FileWorkspaceRepository(dataDir);
}

class FileWorkspaceRepository {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'workspace.json');
    this.kind = 'file';
  }

  async ensureDir() {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async health() {
    try {
      await this.ensureDir();
      return {
        ok: true,
        storage: this.kind,
        auditStorage: this.kind,
        activityMode: 'embedded',
      };
    } catch (error) {
      return { ok: false, storage: this.kind, auditStorage: this.kind, message: error instanceof Error ? error.message : 'Unknown file storage error' };
    }
  }

  async readWorkspace() {
    await this.ensureDir();
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return { ...createDefaultWorkspace(), ...JSON.parse(raw) };
    } catch {
      const initial = createDefaultWorkspace();
      await this.writeWorkspace(initial);
      return initial;
    }
  }

  async writeWorkspace(workspace) {
    await this.ensureDir();
    const next = { ...workspace, updatedAt: new Date().toISOString() };
    await fs.writeFile(this.filePath, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  async listActivity({ entityType, entityId, customerId, limit = DEFAULT_ACTIVITY_LIMIT } = {}) {
    const workspace = await this.readWorkspace();
    return (workspace.activity || [])
      .filter((entry) => (entityType ? entry.entityType === entityType : true))
      .filter((entry) => (entityId ? entry.entityId === entityId : true))
      .filter((entry) => (customerId ? entry.customerId === customerId : true))
      .slice(0, limit);
  }

  async appendActivity(_entry) {}

  async replaceActivity(_entries) {}

  async log(_entry) {}

  async listLogs() {
    return [];
  }
}

class PostgresWorkspaceRepository {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    });
    this.kind = 'postgres';
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_snapshots (
        workspace_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_activity (
        id TEXT PRIMARY KEY,
        workspace_key TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        handoff_to TEXT,
        visibility TEXT NOT NULL DEFAULT 'all',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS workspace_activity_workspace_created_idx
      ON workspace_activity (workspace_key, created_at DESC)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS workspace_activity_entity_idx
      ON workspace_activity (workspace_key, entity_type, entity_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS workspace_activity_customer_idx
      ON workspace_activity (workspace_key, customer_id)
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id BIGSERIAL PRIMARY KEY,
        level TEXT NOT NULL,
        code TEXT NOT NULL,
        message TEXT NOT NULL,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    this.initialized = true;
  }

  async health() {
    try {
      await this.init();
      await this.pool.query('SELECT 1');
      const activityProbe = await this.pool.query('SELECT COUNT(*)::int AS count FROM workspace_activity WHERE workspace_key = $1', [WORKSPACE_KEY]);
      return {
        ok: true,
        storage: this.kind,
        auditStorage: 'postgres',
        activityMode: 'relational',
        activityCount: activityProbe.rows[0]?.count || 0,
      };
    } catch (error) {
      return { ok: false, storage: this.kind, auditStorage: 'postgres', message: error instanceof Error ? error.message : 'Unknown postgres error' };
    }
  }

  async ensureSeedActivity(snapshot) {
    const count = await this.pool.query('SELECT COUNT(*)::int AS count FROM workspace_activity WHERE workspace_key = $1', [WORKSPACE_KEY]);
    if ((count.rows[0]?.count || 0) > 0) return;
    const source = snapshot?.activity?.length ? snapshot.activity : createDefaultWorkspace().activity;
    if (!source.length) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const entry of sortActivity(source)) {
        await client.query(
          `INSERT INTO workspace_activity
            (id, workspace_key, kind, title, detail, customer_id, customer_name, timestamp, actor, entity_type, entity_id, handoff_to, visibility)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO NOTHING`,
          [
            entry.id,
            WORKSPACE_KEY,
            entry.kind,
            entry.title,
            entry.detail,
            entry.customerId,
            entry.customerName,
            entry.timestamp,
            entry.actor,
            entry.entityType || null,
            entry.entityId || null,
            entry.handoffTo || null,
            entry.visibility || 'all',
          ],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async readWorkspace() {
    await this.init();
    const result = await this.pool.query('SELECT payload FROM workspace_snapshots WHERE workspace_key = $1 LIMIT 1', [WORKSPACE_KEY]);
    if (!result.rowCount) {
      const initial = createDefaultWorkspace();
      await this.writeWorkspace(initial);
      await this.ensureSeedActivity(initial);
      return { ...initial, activity: await this.listActivity() };
    }
    const snapshot = { ...createDefaultWorkspace(), ...result.rows[0].payload };
    await this.ensureSeedActivity(snapshot);
    return { ...snapshot, activity: await this.listActivity() };
  }

  async writeWorkspace(workspace) {
    await this.init();
    const { activity: _activity, ...payload } = workspace;
    const next = { ...payload, updatedAt: new Date().toISOString() };
    await this.pool.query(`
      INSERT INTO workspace_snapshots (workspace_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (workspace_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `, [WORKSPACE_KEY, JSON.stringify(next)]);
    return { ...workspace, ...next };
  }

  async listActivity({ entityType, entityId, customerId, limit = DEFAULT_ACTIVITY_LIMIT } = {}) {
    await this.init();
    const clauses = ['workspace_key = $1'];
    const params = [WORKSPACE_KEY];
    if (entityType) {
      params.push(entityType);
      clauses.push(`entity_type = $${params.length}`);
    }
    if (entityId) {
      params.push(entityId);
      clauses.push(`entity_id = $${params.length}`);
    }
    if (customerId) {
      params.push(customerId);
      clauses.push(`customer_id = $${params.length}`);
    }
    params.push(limit);
    const query = `
      SELECT id, kind, title, detail, customer_id, customer_name, timestamp, actor, entity_type, entity_id, handoff_to, visibility
      FROM workspace_activity
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `;
    const result = await this.pool.query(query, params);
    return result.rows.map(normalizeActivityRow);
  }

  async appendActivity(entry) {
    await this.init();
    await this.pool.query(
      `INSERT INTO workspace_activity
        (id, workspace_key, kind, title, detail, customer_id, customer_name, timestamp, actor, entity_type, entity_id, handoff_to, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        entry.id,
        WORKSPACE_KEY,
        entry.kind,
        entry.title,
        entry.detail,
        entry.customerId,
        entry.customerName,
        entry.timestamp,
        entry.actor,
        entry.entityType || null,
        entry.entityId || null,
        entry.handoffTo || null,
        entry.visibility || 'all',
      ],
    );
  }

  async replaceActivity(entries) {
    await this.init();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM workspace_activity WHERE workspace_key = $1', [WORKSPACE_KEY]);
      for (const entry of entries) {
        await client.query(
          `INSERT INTO workspace_activity
            (id, workspace_key, kind, title, detail, customer_id, customer_name, timestamp, actor, entity_type, entity_id, handoff_to, visibility)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            entry.id,
            WORKSPACE_KEY,
            entry.kind,
            entry.title,
            entry.detail,
            entry.customerId,
            entry.customerName,
            entry.timestamp,
            entry.actor,
            entry.entityType || null,
            entry.entityId || null,
            entry.handoffTo || null,
            entry.visibility || 'all',
          ],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async log(entry) {
    await this.init();
    await this.pool.query(
      'INSERT INTO api_logs (level, code, message, meta) VALUES ($1, $2, $3, $4::jsonb)',
      [entry.level || 'info', entry.code || 'UNKNOWN', entry.message || '', JSON.stringify(entry.meta || {})],
    );
  }

  async listLogs({ level, limit = 80 } = {}) {
    await this.init();
    const params = [WORKSPACE_KEY];
    let index = 2;
    let where = '';
    if (level) {
      where += ` AND level = $${index}`;
      params.push(level);
      index += 1;
    }
    params.push(limit);
    const result = await this.pool.query(
      `SELECT id::text, level, code, message, meta, created_at
       FROM api_logs
       WHERE 1=1 ${where}
       ORDER BY created_at DESC
       LIMIT $${index}`,
      params,
    );
    return result.rows.map((row) => ({
      id: row.id,
      level: row.level,
      code: row.code,
      message: row.message,
      meta: row.meta || {},
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  }
}
