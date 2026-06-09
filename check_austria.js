const db = require('better-sqlite3')('data/worldcup.db');
const teams = db.prepare("SELECT * FROM teams WHERE team_name LIKE '%Austria%'").all();
console.log('Teams:', teams);

if (teams.length > 0) {
    const squad = db.prepare("SELECT p.given_name, p.family_name FROM squads s JOIN players p ON s.player_id = p.player_id WHERE s.tournament_id = 'TR-2026' AND s.team_id = ?").all(teams[0].team_id);
    console.log('2026 Austria Squad:', squad);
}
