import { simulateMatch, MatchResult } from './simulation';
import { LeagueTeam, LeagueMatch, LeagueScorer } from './leagueSimulation';

// Reusa as interfaces básicas de LeagueTeam e LeagueScorer, 
// pois representam a mesma estrutura (um time num torneio com stats, etc).

export interface CopaState {
  version: number;
  currentRound: number; // 1-3 Grupos, 4 Oitavas, 5 Quartas, 6 Semi, 7 Final
  totalRounds: number; // 7
  teams: LeagueTeam[];
  matches: LeagueMatch[]; // Todos os jogos (Grupos e Mata-Mata)
  scorersMap: Record<string, LeagueScorer>;
  // Estrutura das chaves:
  // A, B, C, D, E, F, G, H (Grupos)
  groups: Record<string, string[]>; // Map de 'A' => [teamId1, teamId2, teamId3, teamId4]
  knockoutBrackets: {
    round: number; // 4=Oitavas, 5=Quartas, 6=Semi, 7=Final
    homeId: string;
    awayId: string;
    nextMatchIndex: number | null; // índice da partida subsequente na array geral
  }[];
}

/**
 * Gera as 3 rodadas de fase de grupos para 32 times divididos em 8 grupos (A-H).
 */
export function generateCopaGroupMatches(teams: LeagueTeam[]): { groups: Record<string, string[]>, matches: LeagueMatch[] } {
  if (teams.length !== 32) {
    throw new Error('A Copa do Mundo requer exatamente 32 times');
  }

  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const groups: Record<string, string[]> = {};
  const matches: LeagueMatch[] = [];

  // Dividir os times em 8 grupos
  let teamIndex = 0;
  for (const g of groupNames) {
    groups[g] = [];
    for (let i = 0; i < 4; i++) {
      groups[g].push(teams[teamIndex].id);
      teamIndex++;
    }
    
    // Gerar os jogos do grupo (Round-robin simples: 1v2, 3v4 / 1v3, 2v4 / 1v4, 2v3)
    const t = groups[g];
    
    // Rodada 1
    matches.push({ round: 1, homeId: t[0], awayId: t[1], simulated: false });
    matches.push({ round: 1, homeId: t[2], awayId: t[3], simulated: false });
    
    // Rodada 2
    matches.push({ round: 2, homeId: t[0], awayId: t[2], simulated: false });
    matches.push({ round: 2, homeId: t[3], awayId: t[1], simulated: false });
    
    // Rodada 3
    matches.push({ round: 3, homeId: t[0], awayId: t[3], simulated: false });
    matches.push({ round: 3, homeId: t[1], awayId: t[2], simulated: false });
  }

  return { groups, matches };
}

/**
 * Após a rodada 3, gera os confrontos das Oitavas de Final baseados na classificação dos grupos
 */
export function generateCopaKnockout(groups: Record<string, string[]>, teams: LeagueTeam[]): LeagueMatch[] {
  const matches: LeagueMatch[] = [];
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const qualified: Record<string, LeagueTeam[]> = {};

  // Pegar os 2 primeiros de cada grupo
  for (const g of groupNames) {
    const groupTeams = groups[g].map(id => teams.find(t => t.id === id)!);
    const sorted = [...groupTeams].sort((a, b) => {
      if (b.stats.pts !== a.stats.pts) return b.stats.pts - a.stats.pts;
      if (b.stats.sg !== a.stats.sg) return b.stats.sg - a.stats.sg;
      return b.stats.gf - a.stats.gf;
    });
    qualified[g] = sorted.slice(0, 2);
  }

  // Oitavas (Rodada 4) - Chaveamento clássico da FIFA
  // 1A x 2B (M1)
  // 1C x 2D (M2)
  // 1E x 2F (M3)
  // 1G x 2H (M4)
  // 1B x 2A (M5)
  // 1D x 2C (M6)
  // 1F x 2E (M7)
  // 1H x 2G (M8)

  matches.push({ round: 4, homeId: qualified['A'][0].id, awayId: qualified['B'][1].id, simulated: false });
  matches.push({ round: 4, homeId: qualified['C'][0].id, awayId: qualified['D'][1].id, simulated: false });
  matches.push({ round: 4, homeId: qualified['E'][0].id, awayId: qualified['F'][1].id, simulated: false });
  matches.push({ round: 4, homeId: qualified['G'][0].id, awayId: qualified['H'][1].id, simulated: false });
  matches.push({ round: 4, homeId: qualified['B'][0].id, awayId: qualified['A'][1].id, simulated: false });
  matches.push({ round: 4, homeId: qualified['D'][0].id, awayId: qualified['C'][1].id, simulated: false });
  matches.push({ round: 4, homeId: qualified['F'][0].id, awayId: qualified['E'][1].id, simulated: false });
  matches.push({ round: 4, homeId: qualified['H'][0].id, awayId: qualified['G'][1].id, simulated: false });

  return matches;
}

/**
 * Simula uma partida do mata-mata, forçando um vencedor.
 */
export function simulateCopaKnockoutMatch(home: LeagueTeam, away: LeagueTeam): MatchResult {
  return simulateMatch(
    home.ovr,
    away.ovr,
    home.playerNames,
    away.playerNames,
    true, // requireWinner: Força disputa de pênaltis se der empate!
    home.positionCodes,
    away.positionCodes
  );
}

/**
 * Avança o mata-mata para a próxima fase.
 * Recebe os jogos da rodada atual que acabaram de ser simulados e cria os da próxima.
 */
export function advanceKnockoutPhase(currentRound: number, currentMatches: LeagueMatch[]): LeagueMatch[] {
  if (currentRound < 4 || currentRound >= 7) return []; // Se não for mata-mata ou já for a final, não avança.

  const roundMatches = currentMatches.filter(m => m.round === currentRound);
  const nextMatches: LeagueMatch[] = [];
  const nextRound = currentRound + 1;

  for (let i = 0; i < roundMatches.length; i += 2) {
    const m1 = roundMatches[i];
    const m2 = roundMatches[i + 1];

    if (!m1 || !m2) break;

    // Determina vencedores
    const w1 = getWinner(m1);
    const w2 = getWinner(m2);

    nextMatches.push({
      round: nextRound,
      homeId: w1,
      awayId: w2,
      simulated: false
    });
  }

  return nextMatches;
}

function getWinner(m: LeagueMatch): string {
  if (m.homeGoals! > m.awayGoals!) return m.homeId;
  if (m.awayGoals! > m.homeGoals!) return m.awayId;
  
  // No caso de empate com requireWinner=true, penalties determina o vencedor
  if (m.penalties) {
      if (m.penalties.winner === 'player') return m.homeId;
      if (m.penalties.winner === 'opponent') return m.awayId;
  }
  
  return Math.random() > 0.5 ? m.homeId : m.awayId; // Fallback extremo
}
