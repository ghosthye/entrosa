const db = require('better-sqlite3')('data/worldcup.db');

// Create daily_puzzles table
db.prepare(`
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,
  formation TEXT NOT NULL,
  starting_player_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

// Create duels table
db.prepare(`
CREATE TABLE IF NOT EXISTS duels (
  duel_id TEXT PRIMARY KEY,
  creator_name TEXT NOT NULL,
  creator_team_json TEXT NOT NULL,
  creator_score INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  challenger_name TEXT,
  challenger_team_json TEXT,
  challenger_score INTEGER,
  settings TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

// Insert some mock daily puzzles for today and the next few days
const today = new Date();
const dates = [];
for (let i = -1; i < 5; i++) {
  const d = new Date(today);
  d.setDate(d.getDate() + i);
  dates.push(d.toISOString().split('T')[0]);
}

// Ensure Pelé is correctly in the DB for the puzzle
const pele = db.prepare("SELECT player_id FROM players WHERE family_name = 'Pelé' OR player_id = 'P-38906'").get();
const ronaldo = db.prepare("SELECT player_id FROM players WHERE family_name = 'Ronaldo' AND given_name = 'Cristiano'").get();
const zidane = db.prepare("SELECT player_id FROM players WHERE family_name = 'Zidane' AND given_name = 'Zinedine'").get();

const puzzles = [
  { date: dates[0], formation: '4-3-3', starting_player_id: pele?.player_id || 'P-38906' }, // Yesterday
  { date: dates[1], formation: '4-4-2', starting_player_id: ronaldo?.player_id || 'P-70442' }, // Today
  { date: dates[2], formation: '4-2-3-1', starting_player_id: zidane?.player_id || 'P-56430' }, // Tomorrow
  { date: dates[3], formation: '3-5-2', starting_player_id: 'P-Alaba2026' }, // Day after tomorrow
  { date: dates[4], formation: '4-3-3', starting_player_id: 'P-80404' } // Maradona
];

const insertPuzzle = db.prepare(`
  INSERT OR REPLACE INTO daily_puzzles (date, formation, starting_player_id)
  VALUES (?, ?, ?)
`);

db.transaction(() => {
  for (const p of puzzles) {
    insertPuzzle.run(p.date, p.formation, p.starting_player_id);
  }
})();

console.log('Database tables daily_puzzles and duels created successfully!');
console.log('Mock daily puzzles inserted for dates:', dates);
