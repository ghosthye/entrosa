import Database from 'better-sqlite3';
const db = new Database('./data/worldcup.db');

const rows = db.prepare("SELECT player_id, position_name, position_code FROM squads WHERE player_id = 'P-14758'").all();
console.log(rows);
