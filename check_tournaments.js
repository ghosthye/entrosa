const db = require('better-sqlite3')('data/worldcup.db');
const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY year DESC LIMIT 5').all();
console.log(tournaments);
