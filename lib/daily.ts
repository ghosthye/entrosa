export interface DailyPuzzle {
  formation: string;
  startingPlayerId: string;
  puzzleNumber: number;
}

const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];

const curatedStartingPlayers = [
  'P-14758', // Messi
  'P-70442', // Cristiano Ronaldo
  'P-62722', // Ronaldo Fenômeno
  'P-56430', // Zidane
];

export function getDailyPuzzle(dateString: string): DailyPuzzle {
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = (seed << 5) - seed + dateString.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed);

  const formation = formations[seed % formations.length];
  const startingPlayerId = curatedStartingPlayers[seed % curatedStartingPlayers.length];

  const launchDate = new Date('2026-06-08');
  const currentDate = new Date(dateString);
  const diffTime = Math.abs(currentDate.getTime() - launchDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return {
    formation,
    startingPlayerId,
    puzzleNumber: diffDays,
  };
}
