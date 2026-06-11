import Database from 'better-sqlite3';
import path from 'path';

let dbWorldCup: Database.Database | null = null;
let dbBrasileirao: Database.Database | null = null;

export function getDb(league: 'worldcup' | 'brasileirao' = 'worldcup') {
  try {
    if (league === 'brasileirao') {
      if (!dbBrasileirao) {
        const dbPath = path.resolve(process.cwd(), 'data', 'brasileirao.db');
        // readonly: true é obrigatório no Vercel (filesystem somente leitura em produção)
        dbBrasileirao = new Database(dbPath, { readonly: true });
      }
      return dbBrasileirao;
    }

    if (!dbWorldCup) {
      const dbPath = path.resolve(process.cwd(), 'data', 'worldcup.db');
      // readonly: true é obrigatório no Vercel (filesystem somente leitura em produção)
      dbWorldCup = new Database(dbPath, { readonly: true });
    }
    return dbWorldCup;
  } catch (err) {
    console.error(`Failed to connect to ${league} database:`, err);
    throw err;
  }
}
