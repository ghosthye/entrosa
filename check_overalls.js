const db = require('better-sqlite3')('data/worldcup.db');

const stmt = db.prepare(`
    SELECT p.player_id, p.given_name, p.family_name,
           COUNT(DISTINCT a.match_id) as matches,
           COUNT(DISTINCT s.tournament_id) as tournaments
    FROM players p
    LEFT JOIN squads s ON p.player_id = s.player_id
    LEFT JOIN appearances a ON p.player_id = a.player_id
    GROUP BY p.player_id
`);
const rawPlayers = stmt.all();

let count99 = 0;
let list99 = [];
let buckets = { '95-99': 0, '90-94': 0, '85-89': 0, '80-84': 0, 'Below 80': 0 };

rawPlayers.forEach(p => {
    // Nova fórmula sugerida: menos peso nas partidas
    let overall = 65 + (p.matches * 1.2) + (p.tournaments * 2);
    if (overall > 99) overall = 99;
    overall = Math.floor(overall);

    if (overall === 99) {
        count99++;
        list99.push(`${p.given_name} ${p.family_name}`);
    }

    if (overall >= 95) buckets['95-99']++;
    else if (overall >= 90) buckets['90-94']++;
    else if (overall >= 85) buckets['85-89']++;
    else if (overall >= 80) buckets['80-84']++;
    else buckets['Below 80']++;
});

console.log(`Players with 99 OVR: ${count99}`);
console.log(`First 10 players with 99: ${list99.slice(0, 10).join(', ')}`);
console.log('Distribution:', buckets);
