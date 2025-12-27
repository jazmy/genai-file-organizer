#!/usr/bin/env node
import { runMigrationsCLI } from './migrationRunner.js';

const command = process.argv[2] || 'migrate';
runMigrationsCLI(command).catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
