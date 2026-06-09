const db = require('better-sqlite3')('data/worldcup.db');

db.prepare(`
DELETE FROM squads 
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM squads
  GROUP BY tournament_id, team_id, player_id
)
`).run();

const count = db.prepare("SELECT count(*) as c FROM squads WHERE tournament_id = 'TR-2026'").get();
console.log(`Squads in 2026 after deduplication: ${count.c}`);
