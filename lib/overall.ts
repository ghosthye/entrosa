import { getDb } from './db';

interface PlayerStats {
  matches: number;
  tournaments: number;
}

const statsCache = new Map<string, PlayerStats>();

const LEGEND_OVERRIDES: Record<string, number> = {
  'P-38906': 99, // Pelé
  'P-80404': 99, // Maradona
  'P-62722': 99, // Ronaldo (Fenômeno)
  'P-56430': 98, // Zidane
  'P-50564': 98, // Cruyff
  'P-72864': 98, // Beckenbauer
  'P-46080': 97, // Garrincha
  'P-61251': 97, // Romário
  'P-57361': 97, // Ronaldinho
  'P-74261': 96, // Rivaldo
  'P-08939': 96, // Platini
  'P-37483': 96, // Zico
};

export function getPlayerOverall(playerId: string): number {
  if (!statsCache.has(playerId)) {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        COUNT(DISTINCT a.match_id) as matches,
        COUNT(DISTINCT s.tournament_id) as tournaments
      FROM players p
      LEFT JOIN appearances a ON p.player_id = a.player_id
      LEFT JOIN squads s ON p.player_id = s.player_id
      WHERE p.player_id = ?
      GROUP BY p.player_id
    `).get(playerId) as { matches: number, tournaments: number } | undefined;

    if (row) {
      statsCache.set(playerId, row);
    } else {
      statsCache.set(playerId, { matches: 0, tournaments: 0 });
    }
  }

  const stats = statsCache.get(playerId)!;
  
  if (LEGEND_OVERRIDES[playerId]) {
    return LEGEND_OVERRIDES[playerId];
  }
  
  // Fórmula: Base 65 + (1.2 * partidas) + (2 * torneios)
  let overall = 65 + (stats.matches * 1.2) + (stats.tournaments * 2);
  
  if (overall > 99) overall = 99;
  return Math.floor(overall);
}
