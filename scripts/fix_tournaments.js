const Database = require('better-sqlite3');
const db = new Database('data/brasileirao.db');

// Encontrar tournament_ids que existem em squads mas não em tournaments
const missing = db.prepare(`
  SELECT DISTINCT s.tournament_id 
  FROM squads s 
  LEFT JOIN tournaments t ON s.tournament_id = t.tournament_id 
  WHERE t.tournament_id IS NULL
`).all();

console.log('Tournament IDs faltando:', missing.length);
missing.forEach(m => console.log('  ', m.tournament_id));

// Inserir os faltantes
const ins = db.prepare('INSERT OR IGNORE INTO tournaments (tournament_id, year, tournament_name) VALUES (?, ?, ?)');
for (const m of missing) {
  const tid = m.tournament_id;
  // Extrair o ano dos primeiros 4 dígitos após "BR_"
  const yearStr = tid.replace('BR_', '').substring(0, 4);
  const year = parseInt(yearStr);
  ins.run(tid, year, 'Brasileirão ' + year);
  console.log('  Inserido:', tid, '→', year);
}

// Verificar resultado
const all = db.prepare('SELECT * FROM tournaments ORDER BY year').all();
console.log('\nTournaments agora:', all.length);
all.forEach(t => console.log('  ', t.tournament_id, '|', t.year));

db.close();
console.log('\nPronto!');
