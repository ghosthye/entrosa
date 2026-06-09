const db = require('better-sqlite3')('data/worldcup.db');

try {
  db.prepare(`
    INSERT INTO players (player_id, family_name, given_name, birth_date, wikipedia_link, face_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('P-Alaba2026', 'Alaba', 'David', '1992-06-24', 'https://en.wikipedia.org/wiki/David_Alaba', 'https://cdn.sofifa.net/players/197/445/24_120.png');

  db.prepare(`
    INSERT INTO squads (tournament_id, team_id, player_id, shirt_number, position_name, position_code)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('TR-2026', 'T-05', 'P-Alaba2026', 8, 'defender', 'ZAG');

  console.log('David Alaba was successfully inserted!');
} catch (e) {
  console.error(e);
}
