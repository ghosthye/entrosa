export interface HistoricTeam {
  tournamentYear: number;
  teamName: string;
  squadOveralls: number[];
  playerNames?: string[];
  averageOverall: number;
}

// Simulador de Partida Minuto a Minuto
export interface MatchEvent {
  minute: number;
  type: 'goal' | 'attack' | 'foul';
  team: 'player' | 'opponent';
  description: string;
  scorerName?: string;
}

export interface MatchResult {
  playerGoals: number;
  opponentGoals: number;
  events: MatchEvent[];
}

function getRandomScorer(names: string[]): string {
  if (!names || names.length === 0) return 'Jogador';
  // Favorecer os primeiros do array (geralmente atacantes se estiver ordenado, 
  // mas como pegamos top 11 por overall, os melhores farão mais gols)
  // Usamos um Math.random() ^ 2 para dar um leve viés para os primeiros índices
  const index = Math.floor(Math.pow(Math.random(), 2) * names.length);
  return names[index] || 'Jogador';
}

export function simulateMatch(
  playerTeamOverall: number, 
  opponentTeamOverall: number,
  playerNames: string[] = [],
  opponentNames: string[] = []
): MatchResult {
  const events: MatchEvent[] = [];
  let playerGoals = 0;
  let opponentGoals = 0;

  const diff = playerTeamOverall - opponentTeamOverall;
  
  for (let min = 1; min <= 90; min++) {
    // 8% de chance de acontecer algo de impacto por minuto (média de ~7 eventos por jogo)
    if (Math.random() < 0.08) {
      // Diferença de Overall impacta muito a posse de bola/ataques
      let attackProbability = 0.5 + (diff * 0.02);
      attackProbability = Math.max(0.1, Math.min(0.9, attackProbability));
      const isPlayerAttack = Math.random() < attackProbability;
      
      const attackingTeam = isPlayerAttack ? 'player' : 'opponent';
      const isGoalEvent = Math.random() < Math.max(0.05, Math.min(0.50, 0.20 + (isPlayerAttack ? (diff * 0.015) : (-diff * 0.015))));
      
      if (isGoalEvent) {
        if (attackingTeam === 'player') playerGoals++;
        else opponentGoals++;
        
        const scorer = attackingTeam === 'player' ? getRandomScorer(playerNames) : getRandomScorer(opponentNames);
        events.push({
          minute: min,
          type: 'goal',
          team: attackingTeam,
          scorerName: scorer,
          description: `GOL! ${scorer} balança as redes!`
        });
      } else {
        const attacker = attackingTeam === 'player' ? getRandomScorer(playerNames) : getRandomScorer(opponentNames);
        events.push({
          minute: min,
          type: 'attack',
          team: attackingTeam,
          description: `Ataque perigoso com ${attacker}, mas a bola vai para fora.`
        });
      }
    }
  }

  return { playerGoals, opponentGoals, events };
}
