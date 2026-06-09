const db = require('better-sqlite3')('data/worldcup.db');
const tm = db.prepare("SELECT team_id FROM teams WHERE team_name = 'Argentina'").get();
const players = db.prepare("SELECT p.given_name, p.family_name FROM squads s JOIN players p ON s.player_id = p.player_id WHERE s.team_id = ? AND s.tournament_id = 'TR-2026'").all(tm.team_id);
console.log(players.map(p => p.given_name + ' ' + p.family_name));

const canadaTm = db.prepare("SELECT team_id FROM teams WHERE team_name = 'Canada'").get();
const canadaPlayers = db.prepare("SELECT p.given_name, p.family_name FROM squads s JOIN players p ON s.player_id = p.player_id WHERE s.team_id = ? AND s.tournament_id = 'TR-2026'").all(canadaTm.team_id);
console.log(canadaPlayers.map(p => p.given_name + ' ' + p.family_name));
