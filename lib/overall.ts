import { getDb } from './db';

interface PlayerStats {
  matches: number;
  tournaments: number;
}

const statsCache = new Map<string, PlayerStats>();

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
  
  // Fórmula: Base 65 + (1.5 * partidas) + (3 * torneios)
  let overall = 65 + (stats.matches * 1.5) + (stats.tournaments * 3);
  
  if (overall > 99) overall = 99;
  return Math.floor(overall);
}
