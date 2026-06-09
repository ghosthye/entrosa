import Database from 'better-sqlite3';
import path from 'path';

// Instância singleton para evitar várias conexões no dev
let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'worldcup.db');
    db = new Database(dbPath);
    // Habilitar pragmas úteis (opcional)
    db.pragma('journal_mode = WAL');
  }
  return db;
}
