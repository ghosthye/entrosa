export interface HistoricTeam {
  tournamentYear: number;
  teamName: string;
  squadOveralls: number[];
  playerNames?: string[];
  playerPositions?: string[];
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

export interface PenaltyShootout {
  playerScore: number;
  opponentScore: number;
  playerHistory: boolean[];
  opponentHistory: boolean[];
  winner: 'player' | 'opponent';
}

export interface MatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
}

export interface MatchResult {
  playerGoals: number;
  opponentGoals: number;
  events: MatchEvent[];
  penalties?: PenaltyShootout;
  stats?: {
    player: MatchStats;
    opponent: MatchStats;
  };
}

function getRandomScorer(names: string[], positions?: string[]): string {
  if (!names || names.length === 0) return 'Jogador';
  
  if (!positions || positions.length !== names.length) {
    // Fallback se não tiver posições ou se o tamanho não bater
    const index = Math.floor(Math.pow(Math.random(), 2) * names.length);
    return names[index] || 'Jogador';
  }

  const weights: number[] = names.map((_, i) => {
    const pos = positions[i]?.toUpperCase() || '';
    if (['ATA', 'PE', 'PD', 'CA'].includes(pos)) return 100;
    if (['MEI', 'MC', 'VOL', 'ME', 'MD'].includes(pos)) return 50;
    if (['ZAG', 'LD', 'LE', 'LAT', 'DEF', 'LAD', 'LAE'].includes(pos)) return 10;
    if (pos === 'GOL' || pos === 'GR') return 0;
    return 30; // Default para posições desconhecidas
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return names[Math.floor(Math.random() * names.length)];

  let random = Math.random() * totalWeight;
  for (let i = 0; i < names.length; i++) {
    if (random < weights[i]) return names[i];
    random -= weights[i];
  }

  return names[0];
}

export function simulateMatch(
  playerTeamOverall: number, 
  opponentTeamOverall: number,
  playerNames: string[] = [],
  opponentNames: string[] = [],
  requireWinner: boolean = false,
  playerPositions: string[] = [],
  opponentPositions: string[] = []
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
        
        const scorer = attackingTeam === 'player' 
          ? getRandomScorer(playerNames, playerPositions) 
          : getRandomScorer(opponentNames, opponentPositions);
        
        events.push({
          minute: min,
          type: 'goal',
          team: attackingTeam,
          scorerName: scorer,
          description: `GOL! ${scorer} balança as redes!`
        });
      } else {
        const attacker = attackingTeam === 'player' 
          ? getRandomScorer(playerNames, playerPositions) 
          : getRandomScorer(opponentNames, opponentPositions);
        
        events.push({
          minute: min,
          type: 'attack',
          team: attackingTeam,
          description: `Ataque perigoso com ${attacker}, mas a bola vai para fora.`
        });
      }
    }
  }

  let penalties: PenaltyShootout | undefined = undefined;

  if (requireWinner && playerGoals === opponentGoals) {
    let pScore = 0;
    let oScore = 0;
    const pHistory: boolean[] = [];
    const oHistory: boolean[] = [];
    let round = 1;
    let turn: 'player' | 'opponent' = 'player';
    let isGameOver = false;

    const pProb = 0.75 + (diff * 0.01);
    const oProb = 0.75 - (diff * 0.01);
    
    while (!isGameOver) {
      if (turn === 'player') {
        const goal = Math.random() < Math.max(0.4, Math.min(0.95, pProb));
        pHistory.push(goal);
        if (goal) pScore++;
      } else {
        const goal = Math.random() < Math.max(0.4, Math.min(0.95, oProb));
        oHistory.push(goal);
        if (goal) oScore++;
      }
      
      if (turn === 'opponent') {
        if (round <= 5) {
          const remaining = 5 - round;
          if (pScore > oScore + remaining) isGameOver = true;
          if (oScore > pScore + remaining) isGameOver = true;
        } else {
          if (pScore !== oScore) isGameOver = true;
        }
        if (!isGameOver) {
          round++;
          turn = 'player';
        }
      } else {
        if (round <= 5) {
          const pRemaining = 5 - round;
          const oRemaining = 5 - round + 1;
          if (pScore > oScore + oRemaining) isGameOver = true;
          if (oScore > pScore + pRemaining) isGameOver = true;
        }
        if (!isGameOver) turn = 'opponent';
      }
    }
    penalties = {
      playerScore: pScore,
      opponentScore: oScore,
      playerHistory: pHistory,
      opponentHistory: oHistory,
      winner: pScore > oScore ? 'player' : 'opponent'
    };
  }

  // Generate stats based on events and ovr difference
  const playerAttacks = events.filter(e => e.team === 'player').length;
  const opponentAttacks = events.filter(e => e.team === 'opponent').length;

  let pPossession = 50 + (diff * 0.4);
  pPossession = Math.round(Math.max(35, Math.min(65, pPossession)) + (Math.random() * 6 - 3));
  const oPossession = 100 - pPossession;

  const pShots = Math.max(playerGoals, playerAttacks + Math.floor(Math.random() * 4));
  const oShots = Math.max(opponentGoals, opponentAttacks + Math.floor(Math.random() * 4));

  const pShotsOnTarget = Math.max(playerGoals, Math.floor(pShots * (0.35 + Math.random() * 0.3)));
  const oShotsOnTarget = Math.max(opponentGoals, Math.floor(oShots * (0.35 + Math.random() * 0.3)));

  const stats = {
    player: { possession: pPossession, shots: pShots, shotsOnTarget: pShotsOnTarget },
    opponent: { possession: oPossession, shots: oShots, shotsOnTarget: oShotsOnTarget }
  };

  return { playerGoals, opponentGoals, events, penalties, stats };
}
