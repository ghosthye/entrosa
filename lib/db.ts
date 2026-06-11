import Database from 'better-sqlite3';
import path from 'path';

let dbWorldCup: Database.Database | null = null;
let dbBrasileirao: Database.Database | null = null;

export function getDb(league: 'worldcup' | 'brasileirao' = 'worldcup') {
  try {
    if (league === 'brasileirao') {
      if (!dbBrasileirao) {
        const dbPath = path.resolve(process.cwd(), 'data', 'brasileirao.db');
        dbBrasileirao = new Database(dbPath, { readonly: false });
        dbBrasileirao.pragma('journal_mode = DELETE');
      }
      return dbBrasileirao;
    }

    if (!dbWorldCup) {
      const dbPath = path.resolve(process.cwd(), 'data', 'worldcup.db');
      dbWorldCup = new Database(dbPath, { readonly: false });
      dbWorldCup.pragma('journal_mode = DELETE');
    }
    return dbWorldCup;
  } catch (err) {
    console.error(`Failed to connect to ${league} database:`, err);
    throw err;
  }
}
