import Database from 'better-sqlite3';
import path from 'path';

let dbWorldCup: Database.Database | null = null;
let dbBrasileirao: Database.Database | null = null;

export function getDb(league: 'worldcup' | 'brasileirao' = 'worldcup') {
  if (league === 'brasileirao') {
    if (!dbBrasileirao) {
      const dbPath = path.join(process.cwd(), 'data', 'brasileirao.db');
      dbBrasileirao = new Database(dbPath);
      dbBrasileirao.pragma('journal_mode = WAL');
    }
    return dbBrasileirao;
  }

  if (!dbWorldCup) {
    const dbPath = path.join(process.cwd(), 'data', 'worldcup.db');
    dbWorldCup = new Database(dbPath);
    dbWorldCup.pragma('journal_mode = WAL');
  }
  return dbWorldCup;
}
