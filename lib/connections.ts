import { getDb } from './db';
import { ConnectionRule, Connection, ConnectionType } from './rules';

const LANGUAGE_MAP: Record<string, string> = {
  'Brazil': 'Portuguese',
  'Portugal': 'Portuguese',
  'Angola': 'Portuguese',
  'Argentina': 'Spanish',
  'Spain': 'Spanish',
  'Mexico': 'Spanish',
  'Uruguay': 'Spanish',
  'Colombia': 'Spanish',
  'Chile': 'Spanish',
  'Peru': 'Spanish',
  'Ecuador': 'Spanish',
  'Paraguay': 'Spanish',
  'Bolivia': 'Spanish',
  'Venezuela': 'Spanish',
  'Costa Rica': 'Spanish',
  'Honduras': 'Spanish',
  'El Salvador': 'Spanish',
  'Cuba': 'Spanish',
  'England': 'English',
  'United States': 'English',
  'Australia': 'English',
  'Canada': 'English',
  'Republic of Ireland': 'English',
  'Wales': 'English',
  'Scotland': 'English',
  'Northern Ireland': 'English',
  'New Zealand': 'English',
  'South Africa': 'English',
  'Jamaica': 'English',
  'France': 'French',
  'Belgium': 'French', // Simplified
  'Switzerland': 'French', // Simplified
  'Senegal': 'French',
  'Cameroon': 'French',
  'Ivory Coast': 'French',
  'Algeria': 'French',
  'Morocco': 'French',
  'Tunisia': 'French',
  'Togo': 'French',
  'Zaire': 'French',
  'Haiti': 'French',
  'Germany': 'German',
  'Austria': 'German',
  'East Germany': 'German',
  'Italy': 'Italian',
  'Netherlands': 'Dutch',
  'Dutch East Indies': 'Dutch',
};

function getLanguage(teamName: string): string {
  return LANGUAGE_MAP[teamName] || 'Other';
}

export function getConnections(playerAId: string, playerBId: string, activeRules: ConnectionRule[]): Connection[] {
  const db = getDb();
  const connections: Connection[] = [];

  const hasRule = (rule: ConnectionRule) => activeRules.includes(rule);

  // Helper to fetch player basics
  const getPlayerBasics = (id: string) => {
    return db.prepare(`
      SELECT DISTINCT t.team_name, t.region_name, s.position_code, tr.year
      FROM squads s
      JOIN teams t ON s.team_id = t.team_id
      JOIN tournaments tr ON s.tournament_id = tr.tournament_id
      WHERE s.player_id = ?
    `).all(id) as { team_name: string, region_name: string, position_code: string, year: number }[];
  };

  const basicsA = getPlayerBasics(playerAId);
  const basicsB = getPlayerBasics(playerBId);

  // 1. HARD: Mesma seleção NO MESMO ANO
  if (hasRule('national_team_same_year')) {
    const sharedNationalTeamsStmt = db.prepare(`
      SELECT DISTINCT t.team_name, tr.year
      FROM squads s1
      JOIN squads s2 ON s1.team_id = s2.team_id AND s1.tournament_id = s2.tournament_id
      JOIN teams t ON s1.team_id = t.team_id
      JOIN tournaments tr ON s1.tournament_id = tr.tournament_id
      WHERE s1.player_id = ? AND s2.player_id = ?
    `);
    const sharedNationalTeams = sharedNationalTeamsStmt.all(playerAId, playerBId) as { team_name: string, year: number }[];
    if (sharedNationalTeams.length > 0) {
      connections.push({ type: 'national_team_same_year', points: 20, detail: `Companheiros de Seleção: ${sharedNationalTeams[0].team_name} (${sharedNationalTeams[0].year})` });
    }
  }

  // 2. HARD: Adversários em Campo
  if (hasRule('opponent_same_match')) {
    const opponentStmt = db.prepare(`
      SELECT DISTINCT t1.team_name as team_a, t2.team_name as team_b, tr.year
      FROM appearances a1
      JOIN appearances a2 ON a1.match_id = a2.match_id
      JOIN teams t1 ON a1.team_id = t1.team_id
      JOIN teams t2 ON a2.team_id = t2.team_id
      JOIN tournaments tr ON a1.tournament_id = tr.tournament_id
      WHERE a1.player_id = ? AND a2.player_id = ? AND a1.team_id != a2.team_id
    `);
    const opponentMatches = opponentStmt.all(playerAId, playerBId) as { team_a: string, team_b: string, year: number }[];
    if (opponentMatches.length > 0) {
      connections.push({ type: 'opponent_same_match', points: 15, detail: `Adversários em Campo: ${opponentMatches[0].team_a} vs ${opponentMatches[0].team_b} (${opponentMatches[0].year})` });
    }
  }

  // 3. HARD: Mesmo clube no mesmo ano
  if (hasRule('club_same_year')) {
    const sharedClubsStmt = db.prepare(`
      SELECT DISTINCT c1.club_name, c1.tournament_id
      FROM player_clubs c1
      JOIN player_clubs c2 ON c1.club_name = c2.club_name AND c1.tournament_id = c2.tournament_id
      WHERE c1.player_id = ? AND c2.player_id = ?
    `);
    const sharedClubs = sharedClubsStmt.all(playerAId, playerBId) as { club_name: string, tournament_id: string }[];
    if (sharedClubs.length > 0) {
      const year = sharedClubs[0].tournament_id.split('-')[1];
      connections.push({ type: 'club_same_year', points: 15, detail: `Companheiros de Clube: ${sharedClubs[0].club_name} (${year})` });
    }
  }

  // 4. MEDIUM: Mesma Seleção Qualquer Ano
  if (hasRule('national_team_any_year')) {
    const teamsA = new Set(basicsA.map(b => b.team_name));
    const teamsB = new Set(basicsB.map(b => b.team_name));
    const intersection = Array.from(teamsA).filter(t => teamsB.has(t));
    if (intersection.length > 0 && !connections.some(c => c.type === 'national_team_same_year')) {
      connections.push({ type: 'national_team_any_year', points: 10, detail: `Jogaram pela mesma Seleção: ${intersection[0]}` });
    }
  }

  // 5. MEDIUM: Mesmo Clube Qualquer Ano
  if (hasRule('club_any_year')) {
    const clubsStmtA = db.prepare(`SELECT DISTINCT club_name FROM player_clubs WHERE player_id = ?`).all(playerAId) as {club_name: string}[];
    const clubsStmtB = db.prepare(`SELECT DISTINCT club_name FROM player_clubs WHERE player_id = ?`).all(playerBId) as {club_name: string}[];
    const clubsA = new Set(clubsStmtA.map(c => c.club_name));
    const clubsB = new Set(clubsStmtB.map(c => c.club_name));
    const intersection = Array.from(clubsA).filter(c => clubsB.has(c));
    if (intersection.length > 0 && !connections.some(c => c.type === 'club_same_year')) {
      connections.push({ type: 'club_any_year', points: 10, detail: `Vestiram a camisa do mesmo Clube: ${intersection[0]}` });
    }
  }

  // 6. MEDIUM: Mesma Copa
  if (hasRule('same_cup')) {
    const yearsA = new Set(basicsA.map(b => b.year));
    const yearsB = new Set(basicsB.map(b => b.year));
    const intersection = Array.from(yearsA).filter(y => yearsB.has(y));
    if (intersection.length > 0 && !connections.some(c => c.type === 'national_team_same_year' || c.type === 'opponent_same_match' || c.type === 'club_same_year')) {
      connections.push({ type: 'same_cup', points: 8, detail: `Disputaram a mesma edição da Copa: ${intersection[0]}` });
    }
  }

  // 7. EASY: Mesmo Continente
  if (hasRule('same_continent')) {
    const regionsA = new Set(basicsA.map(b => b.region_name));
    const regionsB = new Set(basicsB.map(b => b.region_name));
    const intersection = Array.from(regionsA).filter(r => regionsB.has(r));
    if (intersection.length > 0 && !connections.some(c => c.type === 'national_team_same_year' || c.type === 'national_team_any_year')) {
      connections.push({ type: 'same_continent', points: 2, detail: `Nascidos no mesmo Continente: ${intersection[0]}` });
    }
  }

  // 8. EASY: Mesma Posição
  if (hasRule('same_position')) {
    const posA = new Set(basicsA.map(b => b.position_code));
    const posB = new Set(basicsB.map(b => b.position_code));
    const intersection = Array.from(posA).filter(p => posB.has(p));
    if (intersection.length > 0 && intersection[0] !== 'N/A') {
      connections.push({ type: 'same_position', points: 2, detail: `Atuam na mesma Posição: ${intersection[0]}` });
    }
  }

  // 9. EASY: Mesmo Idioma
  if (hasRule('same_language')) {
    const langA = new Set(basicsA.map(b => getLanguage(b.team_name)));
    const langB = new Set(basicsB.map(b => getLanguage(b.team_name)));
    const intersection = Array.from(langA).filter(l => langB.has(l) && l !== 'Other');
    if (intersection.length > 0 && !connections.some(c => c.type === 'national_team_same_year' || c.type === 'national_team_any_year')) {
      const displayLang = intersection[0] === 'Portuguese' ? 'Português' : 
                          intersection[0] === 'Spanish' ? 'Espanhol' : 
                          intersection[0] === 'English' ? 'Inglês' : 
                          intersection[0] === 'French' ? 'Francês' : 
                          intersection[0] === 'German' ? 'Alemão' : 
                          intersection[0] === 'Italian' ? 'Italiano' : 
                          intersection[0] === 'Dutch' ? 'Holandês' : intersection[0];
      connections.push({ type: 'same_language', points: 3, detail: `Falam o mesmo idioma nativo: ${displayLang}` });
    }
  }

  return connections;
}

export function getBestConnection(connections: Connection[]): Connection | null {
  return connections.sort((a, b) => b.points - a.points)[0] ?? null;
}
