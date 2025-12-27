import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, mkdirSync, existsSync } from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../data/genorganize.db');
const MIGRATIONS_DIR = join(__dirname, 'migrations');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

class MigrationRunner {
  constructor() {
    this.db = null;
  }

  connect() {
    if (!this.db) {
      this.db = new Database(DB_PATH);
      this.ensureMigrationsTable();
    }
    return this.db;
  }

  ensureMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
    `);
  }

  getAppliedMigrations() {
    const stmt = this.db.prepare('SELECT name FROM migrations ORDER BY applied_at ASC');
    return stmt.all().map(row => row.name);
  }

  getMigrationFiles() {
    if (!existsSync(MIGRATIONS_DIR)) {
      mkdirSync(MIGRATIONS_DIR, { recursive: true });
      return [];
    }

    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.js'))
      .sort();

    return files;
  }

  async loadMigration(filename) {
    const migrationPath = join(MIGRATIONS_DIR, filename);
    const migration = await import(`file://${migrationPath}`);
    return migration.default || migration;
  }

  async runMigrations() {
    logger.info('[Migrations] Connecting to database...');
    this.connect();
    logger.info('[Migrations] Connected');

    const applied = new Set(this.getAppliedMigrations());
    logger.info(`[Migrations] Found ${applied.size} applied migrations`);
    const migrationFiles = this.getMigrationFiles();
    logger.info(`[Migrations] Found ${migrationFiles.length} migration files`);
    const pending = migrationFiles.filter(f => !applied.has(f));

    if (pending.length === 0) {
      logger.info('[Migrations] No pending migrations');
      return { applied: 0, total: migrationFiles.length };
    }

    logger.info(`[Migrations] Found ${pending.length} pending migrations`);

    let appliedCount = 0;
    for (const filename of pending) {
      try {
        logger.info(`[Migrations] Running: ${filename}`);

        const migration = await this.loadMigration(filename);

        if (typeof migration.up !== 'function') {
          throw new Error(`Migration ${filename} does not export an 'up' function`);
        }

        // Run migration in a transaction
        this.db.exec('BEGIN TRANSACTION');
        try {
          await migration.up(this.db);

          // Record migration
          const insertStmt = this.db.prepare(
            'INSERT INTO migrations (name) VALUES (?)'
          );
          insertStmt.run(filename);

          this.db.exec('COMMIT');
          logger.info(`[Migrations] Completed: ${filename}`);
          appliedCount++;
        } catch (err) {
          this.db.exec('ROLLBACK');
          throw err;
        }
      } catch (error) {
        logger.error(`[Migrations] Failed: ${filename} - ${error.message}`);
        throw error;
      }
    }

    return { applied: appliedCount, total: migrationFiles.length };
  }

  async rollback(migrationName) {
    this.connect();

    const applied = this.getAppliedMigrations();
    if (!applied.includes(migrationName)) {
      throw new Error(`Migration ${migrationName} has not been applied`);
    }

    const migration = await this.loadMigration(migrationName);

    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${migrationName} does not export a 'down' function`);
    }

    logger.info(`[Migrations] Rolling back: ${migrationName}`);

    this.db.exec('BEGIN TRANSACTION');
    try {
      await migration.down(this.db);

      const deleteStmt = this.db.prepare('DELETE FROM migrations WHERE name = ?');
      deleteStmt.run(migrationName);

      this.db.exec('COMMIT');
      logger.info(`[Migrations] Rolled back: ${migrationName}`);
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async status() {
    this.connect();

    const applied = this.getAppliedMigrations();
    const migrationFiles = this.getMigrationFiles();
    const pending = migrationFiles.filter(f => !applied.includes(f));

    return {
      applied: applied.map(name => ({ name, status: 'applied' })),
      pending: pending.map(name => ({ name, status: 'pending' })),
      total: migrationFiles.length,
    };
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();

// CLI entry point
export async function runMigrationsCLI(command = 'migrate') {
  try {
    switch (command) {
      case 'migrate':
      case 'up': {
        const result = await migrationRunner.runMigrations();
        console.log(`Applied ${result.applied} migration(s)`);
        break;
      }
      case 'status': {
        const status = await migrationRunner.status();
        console.log('\nMigration Status:');
        console.log('================');
        for (const m of status.applied) {
          console.log(`  [x] ${m.name}`);
        }
        for (const m of status.pending) {
          console.log(`  [ ] ${m.name}`);
        }
        console.log(`\nTotal: ${status.total}, Applied: ${status.applied.length}, Pending: ${status.pending.length}`);
        break;
      }
      case 'rollback': {
        const status = await migrationRunner.status();
        if (status.applied.length === 0) {
          console.log('No migrations to rollback');
          break;
        }
        const last = status.applied[status.applied.length - 1].name;
        await migrationRunner.rollback(last);
        console.log(`Rolled back: ${last}`);
        break;
      }
      default:
        console.log('Unknown command. Use: migrate, status, or rollback');
    }
  } finally {
    migrationRunner.close();
  }
}

export default migrationRunner;
