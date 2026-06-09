import Database from 'better-sqlite3';
const db = new Database('./data/worldcup.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables);

for (const t of tables) {
  const schema = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`\nSchema for ${t.name}:`, schema.map(s => s.name));
}
