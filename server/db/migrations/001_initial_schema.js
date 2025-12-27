/**
 * Migration: 001_initial_schema
 *
 * Initial schema verification.
 * The complete schema is defined in database.js - this migration
 * simply verifies all expected tables exist.
 */

export const name = '001_initial_schema';

export async function up(db) {
  // Verify all expected tables exist
  const expectedTables = [
    'processed_files',
    'job_queue',
    'processing_status',
    'prompts',
    'prompt_history',
    'settings',
    'ai_logs',
    'api_logs',
    'error_logs',
  ];

  const existingTables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all().map(r => r.name);

  const missingTables = expectedTables.filter(t => !existingTables.includes(t));

  if (missingTables.length > 0) {
    throw new Error(`Missing tables: ${missingTables.join(', ')}. Database may be corrupted.`);
  }

  return { success: true, message: 'Schema verified' };
}

export async function down(db) {
  return { success: true, message: 'No action needed' };
}

export default { name, up, down };
