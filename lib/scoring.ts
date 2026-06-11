import { Connection } from './rules';

export function calculateScore(connections: Connection[], errorsByPosition: Record<number, number>): number {
  let score = 0;
  let hasErrors = false;
  let rareConnectionsCount = 0;

  connections.forEach(conn => {
    score += conn.points;
    if (conn.points >= 3) {
      rareConnectionsCount++;
    }
  });

  let totalErrors = 0;
  for (const pos in errorsByPosition) {
    totalErrors += errorsByPosition[pos];
  }

  if (totalErrors > 0) {
    hasErrors = true;
    score = score * Math.max(0.1, 1 - (totalErrors * 0.1)); // Penalidade por erro
  }

  // Bônus
  if (!hasErrors && connections.length > 0) {
    score *= 1.2; // Placar Limpo
  }

  if (rareConnectionsCount >= connections.length / 2 && connections.length > 0) {
    score *= 1.15; // Enciclopédia
  }

  return Math.round(score);
}
