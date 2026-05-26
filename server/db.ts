import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/workspace.db');
const MIGRATION_PATH = path.join(__dirname, 'migrations/001_initial.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
db.exec(migrationSQL);

export default db;
