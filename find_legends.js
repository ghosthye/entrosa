const db = require('better-sqlite3')('data/worldcup.db');
const names = ['Pelé', 'Maradona', 'Ronaldo', 'Zidane', 'Beckenbauer', 'Cruyff', 'Garrincha', 'Romário', 'Ronaldinho', 'Rivaldo', 'Platini', 'Zico'];
const stmt = db.prepare(`SELECT player_id, given_name, family_name FROM players WHERE family_name IN (${names.map(() => '?').join(',')}) OR given_name IN (${names.map(() => '?').join(',')})`);
console.log(stmt.all(...names, ...names));
