import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DB_PATH = path.join(process.cwd(), 'data', 'worldcup.db');
const TM_DIR = path.join(process.env.USERPROFILE || 'C:\\Users\\Luiz', '.cache', 'kagglehub', 'datasets', 'davidcariboo', 'player-scores', 'versions', '665');

const TM_PLAYERS = path.join(TM_DIR, 'players.csv');
const TM_CLUBS = path.join(TM_DIR, 'clubs.csv');
const TM_APPEARANCES = path.join(TM_DIR, 'appearances.csv');

// Simple CSV line parser
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Normalize names to handle accents and casing
function normalize(str: string) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function seedClubs() {
  if (!fs.existsSync(TM_DIR)) {
    console.error(`Diretório do Transfermarkt não encontrado em ${TM_DIR}. Certifique-se de que o download terminou.`);
    return;
  }

  const db = new Database(DB_PATH);
  
  // 1. Get Fjelstul Players and their World Cup years
  console.log("Carregando jogadores da Copa...");
  const fjPlayers = db.prepare(`
    SELECT p.player_id, p.family_name, p.given_name, p.birth_date, s.tournament_id
    FROM squads s
    JOIN players p ON s.player_id = p.player_id
  `).all() as any[];

  const playerTargets = new Map<string, { family_name: string, given_name: string, birth_date: string, years: Set<number> }>();
  for (const row of fjPlayers) {
    if (!playerTargets.has(row.player_id)) {
      playerTargets.set(row.player_id, {
        family_name: normalize(row.family_name),
        given_name: normalize(row.given_name),
        birth_date: row.birth_date,
        years: new Set()
      });
    }
    const year = parseInt(row.tournament_id.split('-')[1]);
    playerTargets.get(row.player_id)!.years.add(year);
  }

  // 2. Map TM Players to Fjelstul Players
  console.log("Mapeando jogadores do Transfermarkt...");
  const tmToFjId = new Map<string, string>();
  const fjToTmId = new Map<string, string>();
  
  const playersStream = readline.createInterface({
    input: fs.createReadStream(TM_PLAYERS),
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let tmPlayerHeaders: Record<string, number> = {};
  for await (const line of playersStream) {
    const cols = parseCsvLine(line);
    if (isFirstLine) {
      cols.forEach((c, i) => tmPlayerHeaders[c] = i);
      isFirstLine = false;
      continue;
    }
    
    const tmId = cols[tmPlayerHeaders['player_id']];
    const tmLastName = normalize(cols[tmPlayerHeaders['last_name']]);
    const tmFirstName = normalize(cols[tmPlayerHeaders['first_name']]);
    const tmDob = cols[tmPlayerHeaders['date_of_birth']]?.split(' ')[0];
    
    // Find match
    for (const [fjId, fjData] of playerTargets.entries()) {
      // Match by exact Date of Birth AND similar last name
      if (fjData.birth_date && fjData.birth_date === tmDob) {
        if (fjData.family_name === tmLastName || tmLastName.includes(fjData.family_name) || fjData.family_name.includes(tmLastName)) {
          tmToFjId.set(tmId, fjId);
          fjToTmId.set(fjId, tmId);
          break;
        }
      }
    }
  }

  console.log(`Matched ${tmToFjId.size} players between datasets!`);

  // 3. Load TM Clubs
  console.log("Carregando clubes do Transfermarkt...");
  const tmClubs = new Map<string, string>();
  const clubsStream = readline.createInterface({
    input: fs.createReadStream(TM_CLUBS),
    crlfDelay: Infinity
  });
  isFirstLine = true;
  let tmClubHeaders: Record<string, number> = {};
  for await (const line of clubsStream) {
    const cols = parseCsvLine(line);
    if (isFirstLine) {
      cols.forEach((c, i) => tmClubHeaders[c] = i);
      isFirstLine = false;
      continue;
    }
    tmClubs.set(cols[tmClubHeaders['club_id']], cols[tmClubHeaders['name']]);
  }

  // 4. Find clubs for players in WC years
  console.log("Processando aparições (isso pode demorar uns 20 segundos)...");
  // We want to store { fjId_year: club_id }
  const foundClubs = new Map<string, string>();
  
  const appsStream = readline.createInterface({
    input: fs.createReadStream(TM_APPEARANCES),
    crlfDelay: Infinity
  });
  
  isFirstLine = true;
  let tmAppHeaders: Record<string, number> = {};
  for await (const line of appsStream) {
    const cols = parseCsvLine(line);
    if (isFirstLine) {
      cols.forEach((c, i) => tmAppHeaders[c] = i);
      isFirstLine = false;
      continue;
    }
    
    const tmId = cols[tmAppHeaders['player_id']];
    if (!tmToFjId.has(tmId)) continue;
    
    const date = cols[tmAppHeaders['date']];
    if (!date) continue;
    
    const year = parseInt(date.substring(0, 4));
    const fjId = tmToFjId.get(tmId)!;
    
    const targetData = playerTargets.get(fjId)!;
    if (targetData.years.has(year)) {
      // If we haven't registered a club for this year yet, or if it's earlier in the year
      const key = `${fjId}_${year}`;
      if (!foundClubs.has(key)) {
        foundClubs.set(key, cols[tmAppHeaders['player_club_id']]);
      }
    }
  }

  // 5. Insert into DB
  console.log(`Encontrados ${foundClubs.size} registros de clubes históricos! Atualizando banco de dados...`);
  
  db.exec('DELETE FROM player_clubs;'); // Clear existing
  const insertStmt = db.prepare('INSERT INTO player_clubs (player_id, tournament_id, club_name) VALUES (?, ?, ?)');
  
  db.transaction(() => {
    for (const [key, clubId] of foundClubs.entries()) {
      const [fjId, year] = key.split('_');
      const clubName = tmClubs.get(clubId) || 'Unknown Club';
      insertStmt.run(fjId, `WC-${year}`, clubName);
    }
  })();

  console.log("Finalizado com sucesso! O Modo Livre agora tem links de clubes reais.");
}

seedClubs().catch(console.error);
