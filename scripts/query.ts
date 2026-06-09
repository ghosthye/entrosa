import Database from 'better-sqlite3';
const db = new Database('./data/worldcup.db');

const rows = db.prepare("SELECT player_id, given_name, family_name FROM players WHERE family_name IN ('Ronaldo', 'Zidane', 'Messi') OR given_name = 'Ronaldo' LIMIT 10").all();
console.log(rows);
