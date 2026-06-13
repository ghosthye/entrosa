import { simulateMatch, MatchResult } from './simulation';

export interface LeagueTeam {
  id: string;
  name: string;
  year: number;
  ovr: number;
  playerNames: string[];
  positionCodes: string[];
  stats: {
    pts: number;
    v: number;
    e: number;
    d: number;
    gf: number;
    ga: number;
    sg: number;
  };
}

export interface LeagueScorer {
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
}

export interface LeagueMatch {
  round: number;
  homeId: string;
  awayId: string;
  homeGoals?: number;
  awayGoals?: number;
  homeScorers?: string[];
  awayScorers?: string[];
  simulated: boolean;
  events?: any[];
}

/**
 * Gera as 38 rodadas (turno e returno) para 20 times usando o algoritmo de Berger (Round-robin)
 */
export function generateRoundRobin(teams: LeagueTeam[]): LeagueMatch[] {
  const n = teams.length;
  if (n % 2 !== 0) throw new Error('Número de times deve ser par para round-robin simples');

  const matches: LeagueMatch[] = [];
  const teamIds = teams.map(t => t.id);
  
  // Algoritmo de Círculo (Berger)
  const numRounds = n - 1;
  const half = n / 2;
  
  const tempTeams = [...teamIds];

  for (let r = 0; r < numRounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = tempTeams[i];
      const away = tempTeams[n - 1 - i];
      
      // Alternar mando de campo
      if (r % 2 === 0) {
        matches.push({ round: r + 1, homeId: home, awayId: away, simulated: false });
      } else {
        matches.push({ round: r + 1, homeId: away, awayId: home, simulated: false });
      }
    }
    // Rotacionar times (mantendo o primeiro fixo)
    tempTeams.splice(1, 0, tempTeams.pop()!);
  }

  // Returno (espelhado com mandos invertidos)
  const firstTurnCount = matches.length;
  for (let i = 0; i < firstTurnCount; i++) {
    const m = matches[i];
    matches.push({
      round: m.round + numRounds,
      homeId: m.awayId,
      awayId: m.homeId,
      simulated: false
    });
  }

  return matches;
}

export function simulateLeagueMatch(home: LeagueTeam, away: LeagueTeam): MatchResult {
  return simulateMatch(
    home.ovr,
    away.ovr,
    home.playerNames,
    away.playerNames,
    false, // Liga permite empate
    home.positionCodes,
    away.positionCodes
  );
}

export function getStandings(teams: LeagueTeam[]): LeagueTeam[] {
  return [...teams].sort((a, b) => {
    if (b.stats.pts !== a.stats.pts) return b.stats.pts - a.stats.pts;
    if (b.stats.sg !== a.stats.sg) return b.stats.sg - a.stats.sg;
    if (b.stats.gf !== a.stats.gf) return b.stats.gf - a.stats.gf;
    return a.name.localeCompare(b.name); // Alfabeto como último recurso
  });
}

export function getTopScorers(scorers: Record<string, LeagueScorer>): LeagueScorer[] {
  return Object.values(scorers)
    .sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName))
    .slice(0, 10);
}
