import { getDb } from './db';
import { getPlayerOverall } from './overall';
import { HistoricTeam } from './simulation';

export function getRandomHistoricTeams(count: number, league: 'worldcup' | 'brasileirao' = 'worldcup'): HistoricTeam[] {
  const db = getDb(league);
  
  let query = `
    SELECT 
      t.team_name,
      tr.year,
      GROUP_CONCAT(p.player_id) as player_ids,
      GROUP_CONCAT(IFNULL(p.family_name, p.given_name), '|') as player_names,
      GROUP_CONCAT(s.position_code) as position_codes
    FROM squads s
    JOIN players p ON s.player_id = p.player_id
    JOIN teams t ON s.team_id = t.team_id
    JOIN tournaments tr ON s.tournament_id = tr.tournament_id
    WHERE tr.tournament_name LIKE '%Men''s%'
    GROUP BY t.team_id, tr.tournament_id
    HAVING COUNT(p.player_id) >= 11
    ORDER BY RANDOM()
    LIMIT 200
  `;

  if (league === 'brasileirao') {
    query = `
      SELECT 
        t.team_name,
        SUBSTR(s.tournament_id, 4) as year,
        GROUP_CONCAT(p.player_id) as player_ids,
        GROUP_CONCAT(IFNULL(p.family_name, p.given_name), '|') as player_names,
        GROUP_CONCAT(s.position_code) as position_codes
      FROM squads s
      JOIN players p ON s.player_id = p.player_id
      JOIN teams t ON s.team_id = t.team_id
      GROUP BY t.team_id, s.tournament_id
      HAVING COUNT(p.player_id) >= 11
      ORDER BY RANDOM()
      LIMIT 200
    `;
  }

  const rows = db.prepare(query).all() as any[];

  let allTeams = rows.map(r => {
    const playerIds = r.player_ids.split(',');
    const playerNamesRaw = r.player_names.split('|');
    const positionCodesRaw = r.position_codes.split(',');
    
    const players = playerIds.map((id: string, index: number) => ({
      id,
      name: playerNamesRaw[index] || 'Jogador',
      position: positionCodesRaw[index] || 'MC',
      overall: getPlayerOverall(id, league)
    }));
    
    // Pega os 11 melhores do elenco
    players.sort((a: any, b: any) => b.overall - a.overall);
    const top11 = players.slice(0, 11);
    
    const overalls = top11.map((p: any) => p.overall);
    const playerNames = top11.map((p: any) => p.name);
    const playerPositions = top11.map((p: any) => p.position);
    
    const averageOverall = Math.floor(overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length);
    return {
      tournamentYear: parseInt(r.year),
      teamName: league === 'brasileirao' ? r.team_name.replace(/\s\d{4}$/, '').trim() : r.team_name,
      squadOveralls: overalls,
      playerNames,
      playerPositions,
      averageOverall
    };
  });

  const getBaseName = (name: string) => {
    return name.replace(/\s\d{4}$/, '').trim();
  };

  // Filtra times únicos (não permite 2 anos da Nigéria, por exemplo)
  const uniqueTeamsMap = new Map<string, HistoricTeam>();
  for (const t of allTeams) {
    const baseName = getBaseName(t.teamName);
    if (!uniqueTeamsMap.has(baseName)) {
      uniqueTeamsMap.set(baseName, t);
    } else {
      // Se já tem, 50% de chance de trocar por outro ano do mesmo país (mais aleatoriedade)
      if (Math.random() > 0.5) uniqueTeamsMap.set(baseName, t);
    }
  }

  let uniqueTeams = Array.from(uniqueTeamsMap.values());
  
  // Ordena por Força (do pior pro melhor)
  uniqueTeams.sort((a, b) => a.averageOverall - b.averageOverall);

  // Precisamos de exatos 'count' times (normalmente 31)
  if (uniqueTeams.length < count) {
    // Fallback caso não tenha times únicos suficientes (muito raro)
    uniqueTeams = allTeams.slice(0, count);
    uniqueTeams.sort((a, b) => a.averageOverall - b.averageOverall);
  }

  // Distribuição de Dificuldade:
  // A CopaModal lê: 0,1,2 (Grupo), 3 (Oitavas), 4 (Quartas), 5 (Semi), 6 (Final).
  
  const finalTeams = new Array(count);
  
  // Oitavas (3), Quartas (4), Semi (5), Final (6) ganham os MELHORES times!
  finalTeams[6] = uniqueTeams.pop(); // Melhor time
  finalTeams[5] = uniqueTeams.pop(); // 2º Melhor time
  finalTeams[4] = uniqueTeams.pop(); // 3º Melhor time
  finalTeams[3] = uniqueTeams.pop(); // 4º Melhor time

  // Embaralha o resto para os grupos
  uniqueTeams.sort(() => Math.random() - 0.5);

  // Preenche o resto (0, 1, 2 e de 7 em diante)
  for (let i = 0; i < count; i++) {
    if (!finalTeams[i]) {
      finalTeams[i] = uniqueTeams.pop();
    }
  }

  return finalTeams;
}

export function getAllBrasileiraoTeams(requireUniqueClubs = true): HistoricTeam[] {
  const db = getDb('brasileirao');
  
  const query = `
    SELECT 
      t.team_name,
      SUBSTR(s.tournament_id, 4) as year,
      GROUP_CONCAT(p.player_id) as player_ids,
      GROUP_CONCAT(IFNULL(p.family_name, p.given_name), '|') as player_names,
      GROUP_CONCAT(s.position_code) as position_codes
    FROM squads s
    JOIN players p ON s.player_id = p.player_id
    JOIN teams t ON s.team_id = t.team_id
    GROUP BY t.team_id, s.tournament_id
    HAVING COUNT(p.player_id) >= 11
  `;

  const rows = db.prepare(query).all() as any[];

  const allTeams = rows.map(r => {
    const playerIds = r.player_ids.split(',');
    const playerNamesRaw = r.player_names.split('|');
    const positionCodesRaw = r.position_codes.split(',');
    
    const players = playerIds.map((id: string, index: number) => ({
      id,
      name: playerNamesRaw[index] || 'Jogador',
      position: positionCodesRaw[index] || 'MC',
      overall: getPlayerOverall(id, 'brasileirao')
    }));
    
    players.sort((a: any, b: any) => b.overall - a.overall);
    const top11 = players.slice(0, 11);
    
    const overalls = top11.map((p: any) => p.overall);
    const playerNames = top11.map((p: any) => p.name);
    const playerPositions = top11.map((p: any) => p.position);
    
    const averageOverall = Math.floor(overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length);
    return {
      tournamentYear: parseInt(r.year),
      teamName: r.team_name.replace(/\s\d{4}$/, '').trim(),
      squadOveralls: overalls,
      playerNames,
      playerPositions,
      averageOverall
    };
  });

  if (!requireUniqueClubs) return allTeams;

  const getBaseName = (name: string) => name.replace(/\s\d{4}$/, '').trim();
  const uniqueTeamsMap = new Map<string, HistoricTeam>();
  
  // Aleatoriza a ordem para não pegar sempre o mesmo ano do clube
  allTeams.sort(() => Math.random() - 0.5);

  for (const t of allTeams) {
    const baseName = getBaseName(t.teamName);
    if (!uniqueTeamsMap.has(baseName)) {
      uniqueTeamsMap.set(baseName, t);
    }
  }

  const result = Array.from(uniqueTeamsMap.values());
  
  // Se mesmo com nomes únicos não chegamos a 19 times (para fazer uma liga de 20),
  // pegamos o restante do array 'allTeams' (que tem anos duplicados) para completar.
  if (result.length < 19 && allTeams.length > result.length) {
    const alreadySelectedIds = new Set(result.map(t => `${t.teamName}-${t.tournamentYear}`));
    const remaining = allTeams.filter(t => !alreadySelectedIds.has(`${t.teamName}-${t.tournamentYear}`));
    
    // Adiciona o que falta (ou o que tiver disponível)
    const extraNeeded = 19 - result.length;
    result.push(...remaining.slice(0, extraNeeded));
  }

  return result;
}
