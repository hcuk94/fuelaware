import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const repoRoot = process.cwd();
const migrationTable = "_FuelAwareSchemaMigration";

function resolveDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl === "file:./dev.db") {
    return "file:./prisma/dev.db";
  }

  return databaseUrl;
}

function resolveDatabasePath() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`FuelAware automatic migrations only support SQLite file databases. Received: ${databaseUrl}`);
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(repoRoot, rawPath);
}

function tableExists(db, tableName) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName)
  );
}

function columnExists(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "${migrationTable}" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function markMigrationApplied(db, id) {
  db.prepare(`INSERT OR IGNORE INTO "${migrationTable}" ("id") VALUES (?)`).run(id);
}

function isMigrationApplied(db, id) {
  return Boolean(db.prepare(`SELECT 1 FROM "${migrationTable}" WHERE "id" = ?`).get(id));
}

function applyInitialSchema(db) {
  const initSqlPath = path.join(repoRoot, "prisma", "init.sql");
  const initSql = fs.readFileSync(initSqlPath, "utf8");
  db.exec(initSql);
}

function runMigration(db, migration) {
  if (isMigrationApplied(db, migration.id)) {
    return;
  }

  const transaction = db.transaction(() => {
    migration.up(db);
    markMigrationApplied(db, migration.id);
  });

  transaction();
}

const migrations = [
  {
    id: "0001_initial_schema",
    up(db) {
      const appAlreadyInitialized = tableExists(db, "AppSettings") || tableExists(db, "User") || tableExists(db, "Station");
      if (!appAlreadyInitialized) {
        applyInitialSchema(db);
      }
    }
  },
  {
    id: "0002_provider_auto_sync_settings",
    up(db) {
      if (!tableExists(db, "AppSettings")) {
        applyInitialSchema(db);
        return;
      }

      if (!columnExists(db, "AppSettings", "providerAutoSyncConfigs")) {
        db.exec('ALTER TABLE "AppSettings" ADD COLUMN "providerAutoSyncConfigs" TEXT');
      }

      if (!columnExists(db, "AppSettings", "providerAutoSyncState")) {
        db.exec('ALTER TABLE "AppSettings" ADD COLUMN "providerAutoSyncState" TEXT');
      }
    }
  }
];

export function runMigrations() {
  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);

  try {
    db.pragma("foreign_keys = ON");
    ensureMigrationTable(db);

    for (const migration of migrations) {
      runMigration(db, migration);
    }
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
