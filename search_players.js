const db = require('better-sqlite3')('data/worldcup.db');
const alaba = db.prepare("SELECT * FROM players WHERE family_name LIKE '%Alaba%' OR given_name LIKE '%Alaba%'").all();
const marcelo = db.prepare("SELECT * FROM players WHERE family_name LIKE '%Marcelo%' OR given_name LIKE '%Marcelo%'").all();

console.log('Alaba:', alaba);
console.log('Marcelo:', marcelo);
