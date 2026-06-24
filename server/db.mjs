
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { defaultSettings, seedCustomers, seedServiceEvents, team } from './default-workspace.mjs';

const { Pool } = pg;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultWorkspace() {
  return {
    settings: clone(defaultSettings),
    customers: clone(seedCustomers),
    serviceEvents: clone(seedServiceEvents),
    activity: [],
    team: clone(team),
    updatedAt: new Date().toISOString(),
  };
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
      return { ok: true, storage: this.kind };
    } catch (error) {
      return { ok: false, storage: this.kind, message: error instanceof Error ? error.message : 'Unknown file storage error' };
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

  async log(_entry) {}
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
      return { ok: true, storage: this.kind };
    } catch (error) {
      return { ok: false, storage: this.kind, message: error instanceof Error ? error.message : 'Unknown postgres error' };
    }
  }

  async readWorkspace() {
    await this.init();
    const result = await this.pool.query('SELECT payload FROM workspace_snapshots WHERE workspace_key = $1 LIMIT 1', ['primary']);
    if (!result.rowCount) {
      const initial = createDefaultWorkspace();
      await this.writeWorkspace(initial);
      return initial;
    }
    return { ...createDefaultWorkspace(), ...result.rows[0].payload };
  }

  async writeWorkspace(workspace) {
    await this.init();
    const next = { ...workspace, updatedAt: new Date().toISOString() };
    await this.pool.query(`
      INSERT INTO workspace_snapshots (workspace_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (workspace_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `, ['primary', JSON.stringify(next)]);
    return next;
  }

  async log(entry) {
    await this.init();
    await this.pool.query(
      'INSERT INTO api_logs (level, code, message, meta) VALUES ($1, $2, $3, $4::jsonb)',
      [entry.level || 'info', entry.code || 'UNKNOWN', entry.message || '', JSON.stringify(entry.meta || {})],
    );
  }
}
