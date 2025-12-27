/**
 * Migration: Initial Schema Verification
 *
 * This migration ensures all tables and columns exist.
 * The main schema is defined in database.js - this migration
 * handles upgrades from older database versions.
 */

export const name = '001_initial_schema';

// Helper to check if column exists
const columnExists = (db, table, column) => {
  const result = db.prepare(`PRAGMA table_info(${table})`).all();
  return result.some(col => col.name === column);
};

// Helper to check if table exists
const tableExists = (db, table) => {
  const result = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  ).get(table);
  return !!result;
};

export async function up(db) {
  const updates = [];

  // Verify all expected tables exist
  const expectedTables = [
    'processed_files',
    'job_queue',
    'processing_status',
    'prompts',
    'settings',
    'ai_logs',
    'api_logs',
    'error_logs',
  ];

  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all().map(r => r.name);

  for (const table of expectedTables) {
    if (!tables.includes(table)) {
      throw new Error(`Expected table '${table}' not found. Run database initialization first.`);
    }
  }

  // Ensure job_queue has batch_name column
  if (!columnExists(db, 'job_queue', 'batch_name')) {
    db.exec(`ALTER TABLE job_queue ADD COLUMN batch_name TEXT`);
    updates.push('Added batch_name to job_queue');
  }

  // Ensure prompts has version column
  if (!columnExists(db, 'prompts', 'version')) {
    db.exec(`ALTER TABLE prompts ADD COLUMN version INTEGER DEFAULT 1`);
    updates.push('Added version to prompts');
  }

  // Ensure prompt_history table exists
  if (!tableExists(db, 'prompt_history')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS prompt_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        version INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        description TEXT,
        change_type TEXT NOT NULL,
        change_reason TEXT,
        changed_by TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_prompt_history_prompt_id ON prompt_history(prompt_id);
      CREATE INDEX IF NOT EXISTS idx_prompt_history_category ON prompt_history(category);
      CREATE INDEX IF NOT EXISTS idx_prompt_history_version ON prompt_history(category, version DESC);
    `);
    updates.push('Created prompt_history table');

    // Populate initial history for existing prompts
    const prompts = db.prepare('SELECT id, category, prompt, description FROM prompts').all();
    const insertHistory = db.prepare(`
      INSERT INTO prompt_history (prompt_id, category, version, prompt, description, change_type, changed_by)
      VALUES (?, ?, 1, ?, ?, 'initial', 'system')
    `);
    for (const prompt of prompts) {
      const existing = db.prepare('SELECT id FROM prompt_history WHERE prompt_id = ?').get(prompt.id);
      if (!existing) {
        insertHistory.run(prompt.id, prompt.category, prompt.prompt, prompt.description);
      }
    }
  }

  // Ensure ai_logs has all required columns
  const aiLogsColumns = [
    // Categorization enhancements
    { name: 'categorization_model', sql: 'ALTER TABLE ai_logs ADD COLUMN categorization_model TEXT' },
    { name: 'categorization_reasoning', sql: 'ALTER TABLE ai_logs ADD COLUMN categorization_reasoning TEXT' },
    { name: 'llm_category', sql: 'ALTER TABLE ai_logs ADD COLUMN llm_category TEXT' },
    // Naming enhancements
    { name: 'naming_model', sql: 'ALTER TABLE ai_logs ADD COLUMN naming_model TEXT' },
    { name: 'naming_reasoning', sql: 'ALTER TABLE ai_logs ADD COLUMN naming_reasoning TEXT' },
    // Validation tracking
    { name: 'validation_status', sql: 'ALTER TABLE ai_logs ADD COLUMN validation_status TEXT' },
    { name: 'validation_prompt', sql: 'ALTER TABLE ai_logs ADD COLUMN validation_prompt TEXT' },
    { name: 'validation_response', sql: 'ALTER TABLE ai_logs ADD COLUMN validation_response TEXT' },
    { name: 'validation_passed', sql: 'ALTER TABLE ai_logs ADD COLUMN validation_passed INTEGER' },
    { name: 'validation_issues', sql: 'ALTER TABLE ai_logs ADD COLUMN validation_issues TEXT' },
    { name: 'validation_time_ms', sql: 'ALTER TABLE ai_logs ADD COLUMN validation_time_ms INTEGER' },
    { name: 'validated_at', sql: 'ALTER TABLE ai_logs ADD COLUMN validated_at DATETIME' },
    { name: 'original_suggested_name', sql: 'ALTER TABLE ai_logs ADD COLUMN original_suggested_name TEXT' },
    { name: 'corrected_name', sql: 'ALTER TABLE ai_logs ADD COLUMN corrected_name TEXT' },
    // Regeneration tracking
    { name: 'is_regeneration', sql: 'ALTER TABLE ai_logs ADD COLUMN is_regeneration INTEGER DEFAULT 0' },
    { name: 'regeneration_feedback', sql: 'ALTER TABLE ai_logs ADD COLUMN regeneration_feedback TEXT' },
    { name: 'rejected_name', sql: 'ALTER TABLE ai_logs ADD COLUMN rejected_name TEXT' },
  ];

  for (const col of aiLogsColumns) {
    if (!columnExists(db, 'ai_logs', col.name)) {
      db.exec(col.sql);
      updates.push(`Added ${col.name} to ai_logs`);
    }
  }

  if (updates.length === 0) {
    return { success: true, message: 'Schema already up to date' };
  }

  return { success: true, message: `Schema updated: ${updates.join(', ')}` };
}

export async function down(db) {
  // No-op: We don't remove columns in SQLite easily
  return { success: true, message: 'No changes (column removal not supported in SQLite)' };
}

export default { up, down };
