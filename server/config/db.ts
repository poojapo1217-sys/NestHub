import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import mysql from 'mysql2/promise';
import { env } from './env.ts';

export interface DbRunResult {
  insertId: number;
  changes: number;
}

export interface DbExecutor {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<DbRunResult>;
}

let sqliteDb: DatabaseSync | null = null;
let mysqlPool: mysql.Pool | null = null;
let initialized = false;

const SQLITE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('TENANT', 'MANAGER', 'OWNER')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL,
  room_type TEXT NOT NULL,
  total_beds INTEGER NOT NULL DEFAULT 4 CHECK (total_beds > 0)
);

CREATE TABLE IF NOT EXISTS beds (
  bed_id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  bed_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VACANT' CHECK (status IN ('VACANT', 'OCCUPIED', 'MAINTENANCE')),
  UNIQUE (room_id, bed_number),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL UNIQUE,
  joining_date TEXT NOT NULL,
  monthly_rent REAL NOT NULL CHECK (monthly_rent >= 0),
  emergency_contact TEXT NOT NULL,
  address TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CHECKED_OUT')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stay_history (
  stay_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  bed_id INTEGER NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS rent_payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  electricity_share REAL NOT NULL DEFAULT 0,
  other_charges REAL NOT NULL DEFAULT 0,
  payment_month TEXT NOT NULL,
  payment_date TEXT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PAID', 'PENDING', 'FAILED')),
  payment_method TEXT DEFAULT 'UPI (Demo)',
  transaction_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deposits (
  deposit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  deposit_date TEXT NOT NULL,
  refund_amount REAL NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'PARTIAL_REFUND', 'REFUNDED')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS electricity_bills (
  bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  previous_reading INTEGER NOT NULL CHECK (previous_reading >= 0),
  current_reading INTEGER NOT NULL,
  units_consumed INTEGER NOT NULL CHECK (units_consumed >= 0),
  rate_per_unit REAL NOT NULL CHECK (rate_per_unit > 0),
  total_amount REAL NOT NULL CHECK (total_amount >= 0),
  billing_month TEXT NOT NULL,
  recorded_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (room_id, billing_month),
  CHECK (current_reading >= previous_reading),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_code TEXT NOT NULL UNIQUE,
  tenant_id INTEGER NOT NULL,
  room_id INTEGER NULL,
  category TEXT NOT NULL CHECK (category IN ('Electricity', 'Water', 'Wi-Fi', 'Cleaning', 'Furniture', 'Maintenance', 'Other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  complaint_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  resolution_remarks TEXT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  document_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_date TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS food_menu (
  menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Evening Snacks', 'Dinner')),
  food_items TEXT NOT NULL,
  UNIQUE (day, meal_type)
);

CREATE TABLE IF NOT EXISTS expenses (
  expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  expense_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);
`;

function toSqlParams(params: unknown[]): Array<string | number | null | Uint8Array> {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p as string | number | null | Uint8Array;
  });
}

function getSqlite(): DatabaseSync {
  if (!sqliteDb) {
    const dir = path.dirname(env.sqlitePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    sqliteDb = new DatabaseSync(env.sqlitePath);
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
  }
  return sqliteDb;
}

function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
  }
  return mysqlPool;
}

export async function initDatabase(): Promise<void> {
  if (initialized) return;

  if (!fs.existsSync(env.uploadDir)) {
    fs.mkdirSync(env.uploadDir, { recursive: true });
  }

  if (env.dbClient === 'mysql') {
    const pool = getMysqlPool();
    await pool.query('SELECT 1');
  } else {
    const sqlite = getSqlite();
    sqlite.exec(SQLITE_SCHEMA);
  }
  initialized = true;
}

export const db: DbExecutor = {
  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    await initDatabase();
    if (env.dbClient === 'mysql') {
      const [rows] = await getMysqlPool().execute(sql, toSqlParams(params));
      return rows as T[];
    }
    const stmt = getSqlite().prepare(sql);
    return stmt.all(...toSqlParams(params)) as T[];
  },

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  },

  async execute(sql: string, params: unknown[] = []): Promise<DbRunResult> {
    await initDatabase();
    if (env.dbClient === 'mysql') {
      const [result] = await getMysqlPool().execute(sql, toSqlParams(params));
      const header = result as mysql.ResultSetHeader;
      return {
        insertId: Number(header.insertId || 0),
        changes: Number(header.affectedRows || 0),
      };
    }
    const stmt = getSqlite().prepare(sql);
    const res = stmt.run(...toSqlParams(params));
    return {
      insertId: Number(res.lastInsertRowid || 0),
      changes: Number(res.changes || 0),
    };
  },
};

export async function withTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  await initDatabase();

  if (env.dbClient === 'mysql') {
    const conn = await getMysqlPool().getConnection();
    await conn.beginTransaction();
    const txExecutor: DbExecutor = {
      async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
        const [rows] = await conn.execute(sql, toSqlParams(params));
        return rows as R[];
      },
      async queryOne<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R | null> {
        const [rows] = await conn.execute(sql, toSqlParams(params));
        const arr = rows as R[];
        return arr.length > 0 ? arr[0] : null;
      },
      async execute(sql: string, params: unknown[] = []): Promise<DbRunResult> {
        const [result] = await conn.execute(sql, toSqlParams(params));
        const header = result as mysql.ResultSetHeader;
        return {
          insertId: Number(header.insertId || 0),
          changes: Number(header.affectedRows || 0),
        };
      },
    };
    try {
      const output = await fn(txExecutor);
      await conn.commit();
      return output;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  const sqlite = getSqlite();
  sqlite.exec('BEGIN IMMEDIATE;');
  const txExecutor: DbExecutor = {
    async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
      const stmt = sqlite.prepare(sql);
      return stmt.all(...toSqlParams(params)) as R[];
    },
    async queryOne<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R | null> {
      const stmt = sqlite.prepare(sql);
      const rows = stmt.all(...toSqlParams(params)) as R[];
      return rows.length > 0 ? rows[0] : null;
    },
    async execute(sql: string, params: unknown[] = []): Promise<DbRunResult> {
      const stmt = sqlite.prepare(sql);
      const res = stmt.run(...toSqlParams(params));
      return {
        insertId: Number(res.lastInsertRowid || 0),
        changes: Number(res.changes || 0),
      };
    },
  };
  try {
    const output = await fn(txExecutor);
    sqlite.exec('COMMIT;');
    return output;
  } catch (error) {
    sqlite.exec('ROLLBACK;');
    throw error;
  }
}

export function getDbEngineName(): string {
  return env.dbClient === 'mysql' ? 'MySQL' : 'SQLite (Local Development Fallback)';
}
