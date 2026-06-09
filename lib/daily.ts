import { getDb } from './db';

export interface DailyPuzzle {
  formation: string;
  startingPlayerId: string;
  puzzleNumber: number;
}

export function getDailyPuzzle(dateString: string): DailyPuzzle {
  const db = getDb();
  
  const launchDate = new Date('2026-06-08');
  const currentDate = new Date(dateString);
  const diffTime = currentDate.getTime() - launchDate.getTime();
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const row = db.prepare(`SELECT formation, starting_player_id FROM daily_puzzles WHERE date = ?`).get(dateString) as any;
  
  if (row) {
    return {
      formation: row.formation,
      startingPlayerId: row.starting_player_id,
      puzzleNumber: diffDays,
    };
  }

  // Fallback if not registered
  return {
    formation: '4-3-3',
    startingPlayerId: 'P-38906', // Pelé fallback
    puzzleNumber: diffDays,
  };
}
