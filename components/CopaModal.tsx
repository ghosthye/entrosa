import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Trophy, FastForward, List, Image as ImageIcon, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { motion } from 'framer-motion';
import { HistoricTeam, simulateMatch, MatchResult } from '@/lib/simulation';
import { ChainNode } from '@/components/ChainBar';
import { FormationNode } from '@/components/Field';
import { supabase } from '@/lib/supabase';

interface CopaModalProps {
  onClose: () => void;
  playerTeam: ChainNode[];
  nodes2D: FormationNode[][];
}

interface GroupTeam {
  id: string;
  name: string;
  year?: number;
  isPlayer: boolean;
  ovr: number;
  playerNames?: string[];
  pts: number;
  pld: number;
  win: number;
  draw: number;
  loss: number;
  gf: number;
  ga: number;
  gd: number;
}

interface PastMatch {
  id: string;
  phase: string;
  opponent: GroupTeam;
  playerGoals: number;
  opponentGoals: number;
  playerScorers: string[];
  opponentScorers: string[];
  penaltyScore?: { player: number, opponent: number };
  penaltyDetails?: {
    player: { name: string, isGoal: boolean }[];
    opponent: { name: string, isGoal: boolean }[];
  };
}

function getRandomScorer(names: string[]): string {
  if (!names || names.length === 0) return 'Jogador';
  const index = Math.floor(Math.pow(Math.random(), 2) * names.length);
  return names[index] || 'Jogador';
}

export function CopaModal({ onClose, playerTeam, nodes2D }: CopaModalProps) {
  const [opponents, setOpponents] = useState<HistoricTeam[]>([]);
  const [groupStandings, setGroupStandings] = useState<GroupTeam[]>([]);
  
  const [tournamentPhase, setTournamentPhase] = useState<'Grupos' | 'Oitavas' | 'Quartas' | 'Semi' | 'Final' | 'Eliminado' | 'Campeão'>('Grupos');
  const [currentRound, setCurrentRound] = useState(1); 
  
  const [activeTab, setActiveTab] = useState<'Partida' | 'Campanha' | 'Card'>('Partida');
  const [pastMatches, setPastMatches] = useState<PastMatch[]>([]);
  const [eliminatedPhase, setEliminatedPhase] = useState<string | null>(null);

  const [matchLog, setMatchLog] = useState<string[]>([]);
  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [minute, setMinute] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [speed, setSpeed] = useState<'normal' | 'rápida'>('normal');
  const cardRef = useRef<HTMLDivElement>(null);

  const [penaltyPhase, setPenaltyPhase] = useState(false);
  const [penaltyScore, setPenaltyScore] = useState({ player: 0, opponent: 0 });
  const [penaltiesHistory, setPenaltiesHistory] = useState({ player: [] as boolean[], opponent: [] as boolean[] });

  const [cpuLiveMatch, setCpuLiveMatch] = useState<{ goalsA: number, goalsB: number } | null>(null);

  const saveDraftStats = async (isChampion: boolean, finalScorePlayer: number) => {
    let tGoals = pastMatches.reduce((acc, m) => acc + (m.playerGoals || 0), 0);
    tGoals += finalScorePlayer;
    const totalMatches = pastMatches.length + 1;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) return;

      const userId = session.user.id;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      let profileData = profile;
      if (!profileData) {
        // Fallback for brand new users who haven't played the daily puzzle yet
        profileData = {
          id: userId,
          name: session.user.user_metadata?.full_name || 'Anônimo',
          avatar_url: session.user.user_metadata?.avatar_url || ''
        };
      }

      const newWins = (profileData.draft_tournaments_won || 0) + (isChampion ? 1 : 0);
      const newOvr = Math.max(profileData.draft_highest_overall || 0, teamOverall);
      const newTotalGoals = (profileData.draft_total_goals || 0) + tGoals;
      const newTotalMatches = (profileData.draft_total_matches || 0) + totalMatches;

      const { error } = await supabase.from('profiles').upsert({
        ...profileData,
        draft_tournaments_won: newWins,
        draft_highest_overall: newOvr,
        draft_total_goals: newTotalGoals,
        draft_total_matches: newTotalMatches
      }, { onConflict: 'id' });

      if (error) console.error("Error saving draft stats to Supabase:", error);
    } catch (e) {
      console.error(e);
    }
  };

  const teamOverall = Math.floor(
    playerTeam.reduce((acc, node) => acc + (node.player.overall || 70), 0) / playerTeam.length
  );
  
  const playerNamesArray = [...playerTeam].sort((a: any, b: any) => {
    const idA = a.slotId ? parseInt(a.slotId.replace('slot-', '')) : 0;
    const idB = b.slotId ? parseInt(b.slotId.replace('slot-', '')) : 0;
    return idB - idA; // higher slotId (ata) first
  }).map(n => n.player.name ? (n.player.name.split(' ').pop() || 'Jogador') : 'Jogador') as string[];

  useEffect(() => {
    fetch('/api/opponents')
      .then(res => res.json())
      .then((data: HistoricTeam[]) => {
        setOpponents(data);
        const playerT: GroupTeam = {
          id: 'player', name: 'Você', isPlayer: true, ovr: teamOverall, playerNames: playerNamesArray as string[],
          pts: 0, pld: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0
        };
        const cpu1: GroupTeam = {
          id: 'cpu1', name: data[0].teamName, year: data[0].tournamentYear, isPlayer: false, ovr: data[0].averageOverall, playerNames: data[0].playerNames,
          pts: 0, pld: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0
        };
        const cpu2: GroupTeam = {
          id: 'cpu2', name: data[1].teamName, year: data[1].tournamentYear, isPlayer: false, ovr: data[1].averageOverall, playerNames: data[1].playerNames,
          pts: 0, pld: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0
        };
        const cpu3: GroupTeam = {
          id: 'cpu3', name: data[2].teamName, year: data[2].tournamentYear, isPlayer: false, ovr: data[2].averageOverall, playerNames: data[2].playerNames,
          pts: 0, pld: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0
        };
        setGroupStandings([playerT, cpu1, cpu2, cpu3]);
      });
  }, [teamOverall]);

  const getPlayerOpponentForRound = (): GroupTeam | null => {
    if (tournamentPhase === 'Grupos') {
      if (currentRound === 1) return groupStandings.find(t => t.id === 'cpu1') || null;
      if (currentRound === 2) return groupStandings.find(t => t.id === 'cpu2') || null;
      if (currentRound === 3) return groupStandings.find(t => t.id === 'cpu3') || null;
    } else if (tournamentPhase === 'Oitavas' && opponents[3]) {
      return { id: 'k1', name: opponents[3].teamName, year: opponents[3].tournamentYear, isPlayer: false, ovr: opponents[3].averageOverall, playerNames: opponents[3].playerNames } as GroupTeam;
    } else if (tournamentPhase === 'Quartas' && opponents[4]) {
      return { id: 'k2', name: opponents[4].teamName, year: opponents[4].tournamentYear, isPlayer: false, ovr: opponents[4].averageOverall, playerNames: opponents[4].playerNames } as GroupTeam;
    } else if (tournamentPhase === 'Semi' && opponents[5]) {
      return { id: 'k3', name: opponents[5].teamName, year: opponents[5].tournamentYear, isPlayer: false, ovr: opponents[5].averageOverall, playerNames: opponents[5].playerNames } as GroupTeam;
    } else if (tournamentPhase === 'Final' && opponents[6]) {
      return { id: 'k4', name: opponents[6].teamName, year: opponents[6].tournamentYear, isPlayer: false, ovr: opponents[6].averageOverall, playerNames: opponents[6].playerNames } as GroupTeam;
    }
    return null;
  };

  const startPenaltyShootout = (opponent: GroupTeam, matchId: string) => {
    let round = 1;
    let pScore = 0;
    let oScore = 0;
    let pHistory: boolean[] = [];
    let oHistory: boolean[] = [];
    
    let pDetails: { name: string, isGoal: boolean }[] = [];
    let oDetails: { name: string, isGoal: boolean }[] = [];

    let turn: 'player' | 'opponent' = 'player';
    
    const diff = teamOverall - opponent.ovr;
    let playerHitChance = 0.75 + (diff * 0.01); 
    playerHitChance = Math.max(0.4, Math.min(0.95, playerHitChance));
    let opponentHitChance = 0.75 - (diff * 0.01);
    opponentHitChance = Math.max(0.4, Math.min(0.95, opponentHitChance));

    const pTimer = setInterval(() => {
      let isGoal = false;
      let logMsg = '';
      
      if (turn === 'player') {
        const taker = getRandomScorer(playerNamesArray);
        isGoal = Math.random() < playerHitChance;
        pHistory = [...pHistory, isGoal];
        pDetails.push({ name: taker, isGoal });
        if (isGoal) pScore++;
        logMsg = isGoal ? `${taker} vai pra cobrança... GOL! Cobrança perfeita!` : `${taker} na bola... DEFESA DO GOLEIRO! Perdeu!`;
      } else {
        const taker = getRandomScorer(opponent.playerNames || []);
        isGoal = Math.random() < opponentHitChance;
        oHistory = [...oHistory, isGoal];
        oDetails.push({ name: taker, isGoal });
        if (isGoal) oScore++;
        logMsg = isGoal ? `${taker} bate e... GOL!` : `${taker} toma distância... NA TRAVE! Perdeu!`;
      }
      
      setPenaltiesHistory({ player: pHistory, opponent: oHistory });
      setPenaltyScore({ player: pScore, opponent: oScore });
      setMatchLog(prev => [logMsg, ...prev].slice(0, 5));

      let isGameOver = false;
      
      if (turn === 'opponent') {
        if (round <= 5) {
          const remainingKicks = 5 - round;
          if (pScore > oScore + remainingKicks) isGameOver = true;
          if (oScore > pScore + remainingKicks) isGameOver = true;
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
      
      if (isGameOver) {
        clearInterval(pTimer);
        setIsPlaying(false);
        setMatchEnded(true);
        setMatchLog(prev => [`Fim das cobranças! ${pScore > oScore ? 'VITÓRIA' : 'DERROTA'} NOS PÊNALTIS!`, ...prev]);
        
        setPastMatches(prev => prev.map(m => {
          if (m.id === matchId) {
            return { ...m, penaltyScore: { player: pScore, opponent: oScore }, penaltyDetails: { player: pDetails, opponent: oDetails } };
          }
          return m;
        }));

        if (pScore < oScore) {
          setTimeout(() => {
            setEliminatedPhase(tournamentPhase);
            setTournamentPhase('Eliminado');
            setActiveTab('Card');
            saveDraftStats(false, score.player);
          }, 3000);
        } else if (tournamentPhase === 'Final') {
          setTimeout(() => {
            setTournamentPhase('Campeão');
            setActiveTab('Card');
            saveDraftStats(true, score.player);
          }, 3000);
        }
      }
      
    }, speed === 'rápida' ? 1000 : 2500);
  };

  const startMatch = () => {
    setIsPlaying(true);
    setMatchEnded(false);
    setPenaltyPhase(false);
    setPenaltyScore({ player: 0, opponent: 0 });
    setPenaltiesHistory({ player: [], opponent: [] });
    setScore({ player: 0, opponent: 0 });
    setMatchLog(['Apita o árbitro! Começa o jogo!']);
    setMinute(0);

    const opponent = getPlayerOpponentForRound();
    if (!opponent) return;

    const result = simulateMatch(teamOverall, opponent.ovr, playerNamesArray, opponent.playerNames);

    let cpuResult: any = null;
    if (tournamentPhase === 'Grupos') {
      const cpuTeamAId = currentRound === 1 ? 'cpu2' : (currentRound === 2 ? 'cpu1' : 'cpu1');
      const cpuTeamBId = currentRound === 1 ? 'cpu3' : (currentRound === 2 ? 'cpu3' : 'cpu2');
      const cpuA = groupStandings.find(t => t.id === cpuTeamAId)!;
      const cpuB = groupStandings.find(t => t.id === cpuTeamBId)!;
      cpuResult = simulateMatch(cpuA.ovr, cpuB.ovr, cpuA.playerNames, cpuB.playerNames);
      setCpuLiveMatch({ goalsA: 0, goalsB: 0 });
    }

    let currentMin = 0;
    let currentGoalsPlayer = 0;
    let currentGoalsOpponent = 0;
    let currentCpuGoalsA = 0;
    let currentCpuGoalsB = 0;
    let playerScorers: string[] = [];
    let opponentScorers: string[] = [];
    const intervalTime = speed === 'rápida' ? 50 : 200;

    const matchId = `match-${Date.now()}`;

    const timer = setInterval(() => {
      currentMin += 1;
      setMinute(currentMin);
      
      const event = result.events.find(e => e.minute === currentMin);
      if (event) {
        setMatchLog(prev => [`${currentMin}' - ${event.description}`, ...prev].slice(0, 5));
        if (event.type === 'goal') {
          if (event.team === 'player') {
            currentGoalsPlayer++;
            if (event.scorerName) playerScorers.push(event.scorerName);
          } else {
            currentGoalsOpponent++;
            if (event.scorerName) opponentScorers.push(event.scorerName);
          }
          setScore({ player: currentGoalsPlayer, opponent: currentGoalsOpponent });
        }
      }

      if (tournamentPhase === 'Grupos' && cpuResult) {
        const cpuEventA = cpuResult.events.find((e: any) => e.minute === currentMin && e.team === 'player' && e.type === 'goal');
        const cpuEventB = cpuResult.events.find((e: any) => e.minute === currentMin && e.team === 'opponent' && e.type === 'goal');
        if (cpuEventA || cpuEventB) {
          if (cpuEventA) currentCpuGoalsA++;
          if (cpuEventB) currentCpuGoalsB++;
          setCpuLiveMatch({ goalsA: currentCpuGoalsA, goalsB: currentCpuGoalsB });
        }
      }

      const isKnockoutTie = tournamentPhase !== 'Grupos' && currentGoalsPlayer === currentGoalsOpponent;
      const targetMin = isKnockoutTie && currentMin >= 90 ? 120 : 90;

      if (currentMin >= targetMin) {
        clearInterval(timer);
        
        const newMatchRecord: PastMatch = {
          id: matchId,
          phase: tournamentPhase === 'Grupos' ? `Rodada ${currentRound}` : tournamentPhase,
          opponent,
          playerGoals: currentGoalsPlayer,
          opponentGoals: currentGoalsOpponent,
          playerScorers,
          opponentScorers
        };
        setPastMatches(prev => [...prev, newMatchRecord]);

        if (isKnockoutTie) {
          setPenaltyPhase(true);
          setMatchLog(prev => ['Fim da prorrogação! Vamos para os pênaltis!', ...prev]);
          startPenaltyShootout(opponent, matchId);
          return;
        }

        setIsPlaying(false);
        setMatchEnded(true);
        setMatchLog(prev => ['Fim de Jogo!', ...prev]);

        if (tournamentPhase === 'Grupos') {
           setGroupStandings(prev => {
             const newSt = prev.map(t => ({ ...t }));
             
             const updateTeam = (id: string, gf: number, ga: number) => {
               const t = newSt.find(x => x.id === id)!;
               t.pld++; t.gf += gf; t.ga += ga; t.gd = t.gf - t.ga;
               if (gf > ga) { t.win++; t.pts += 3; }
               else if (gf === ga) { t.draw++; t.pts += 1; }
               else { t.loss++; }
             };

             updateTeam('player', currentGoalsPlayer, currentGoalsOpponent);
             updateTeam(opponent.id, currentGoalsOpponent, currentGoalsPlayer);
             updateTeam(tournamentPhase === 'Grupos' ? (currentRound === 1 ? 'cpu2' : (currentRound === 2 ? 'cpu1' : 'cpu1')) : 'none', currentCpuGoalsA, currentCpuGoalsB);
             updateTeam(tournamentPhase === 'Grupos' ? (currentRound === 1 ? 'cpu3' : (currentRound === 2 ? 'cpu3' : 'cpu2')) : 'none', currentCpuGoalsB, currentCpuGoalsA);

             newSt.sort((a, b) => {
               if (a.pts !== b.pts) return b.pts - a.pts;
               if (a.gd !== b.gd) return b.gd - a.gd;
               return b.gf - a.gf;
             });

             return newSt;
           });
           setCpuLiveMatch(null);
        } else {
           if (currentGoalsPlayer < currentGoalsOpponent) {
             setEliminatedPhase(tournamentPhase);
             setTournamentPhase('Eliminado');
             setActiveTab('Card');
             saveDraftStats(false, currentGoalsPlayer);
           } else if (tournamentPhase === 'Final') {
             setTournamentPhase('Campeão');
             setActiveTab('Card');
             saveDraftStats(true, currentGoalsPlayer);
           }
        }
      }
    }, intervalTime);
  };

  const nextMatch = () => {
    if (tournamentPhase === 'Grupos') {
      if (currentRound < 3) {
        setCurrentRound(prev => prev + 1);
        setMatchEnded(false);
        setMinute(0);
        setScore({ player: 0, opponent: 0 });
        setMatchLog([]);
        setPenaltyPhase(false);
        setPenaltiesHistory({ player: [], opponent: [] });
      } else {
        const playerRank = groupStandings.findIndex(t => t.id === 'player');
        if (playerRank === 0 || playerRank === 1) {
          setTournamentPhase('Oitavas');
        } else {
          setEliminatedPhase('Fase de Grupos');
          setTournamentPhase('Eliminado');
          setActiveTab('Card');
          saveDraftStats(false, score.player);
        }
        setMatchEnded(false);
        setMinute(0);
        setScore({ player: 0, opponent: 0 });
        setMatchLog([]);
        setPenaltyPhase(false);
        setPenaltiesHistory({ player: [], opponent: [] });
      }
    } else {
      if (tournamentPhase === 'Oitavas') setTournamentPhase('Quartas');
      else if (tournamentPhase === 'Quartas') setTournamentPhase('Semi');
      else if (tournamentPhase === 'Semi') setTournamentPhase('Final');
      
      setMatchEnded(false);
      setMinute(0);
      setScore({ player: 0, opponent: 0 });
      setMatchLog([]);
      setPenaltyPhase(false);
      setPenaltiesHistory({ player: [], opponent: [] });
    }
  };

  if (opponents.length === 0 || groupStandings.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-white text-xl animate-pulse">Sorteando Adversários...</div>
      </div>
    );
  }

  const currentOpponent = getPlayerOpponentForRound();

  const renderPenaltyDots = (history: boolean[]) => (
    <div className="flex justify-center gap-1 mt-2">
      {history.map((isGoal, i) => (
        <div key={i} className={`w-3 h-3 rounded-full ${isGoal ? 'bg-verde-grama' : 'bg-vermelho-erro'}`} />
      ))}
      {history.length < 5 && Array.from({ length: 5 - history.length }).map((_, i) => (
        <div key={`empty-${i}`} className="w-3 h-3 rounded-full bg-[var(--border-color)]" />
      ))}
    </div>
  );

  const totalGoalsFor = pastMatches.reduce((acc, m) => acc + m.playerGoals, 0);
  const totalGoalsAgainst = pastMatches.reduce((acc, m) => acc + m.opponentGoals, 0);
  const totalWins = pastMatches.filter(m => m.playerGoals > m.opponentGoals || (m.penaltyScore && m.penaltyScore.player > m.penaltyScore.opponent)).length;

  let displayStandings = [...groupStandings];
  if (tournamentPhase === 'Grupos' && isPlaying && currentOpponent && cpuLiveMatch) {
    displayStandings = groupStandings.map(t => ({ ...t }));
    const cpuTeamAId = currentRound === 1 ? 'cpu2' : (currentRound === 2 ? 'cpu1' : 'cpu1');
    const cpuTeamBId = currentRound === 1 ? 'cpu3' : (currentRound === 2 ? 'cpu3' : 'cpu2');

    const updateLiveTeam = (id: string, gf: number, ga: number) => {
      const t = displayStandings.find(x => x.id === id)!;
      t.pld++; t.gf += gf; t.ga += ga; t.gd = t.gf - t.ga;
      if (gf > ga) { t.win++; t.pts += 3; }
      else if (gf === ga) { t.draw++; t.pts += 1; }
      else { t.loss++; }
    };

    updateLiveTeam('player', score.player, score.opponent);
    updateLiveTeam(currentOpponent.id, score.opponent, score.player);
    updateLiveTeam(cpuTeamAId, cpuLiveMatch.goalsA, cpuLiveMatch.goalsB);
    updateLiveTeam(cpuTeamBId, cpuLiveMatch.goalsB, cpuLiveMatch.goalsA);

    displayStandings.sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.gd !== b.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  }

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#0a0a0a', scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `entrosa-campanha-${teamOverall}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 font-sans">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden relative text-[var(--text-primary)]">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-background)] overflow-x-auto hide-scrollbar gap-4">
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <button onClick={() => setActiveTab('Partida')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'Partida' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
              <Play size={18} /> A Partida
            </button>
            <button onClick={() => setActiveTab('Campanha')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'Campanha' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
              <List size={18} /> A Campanha
            </button>
            {(tournamentPhase === 'Eliminado' || tournamentPhase === 'Campeão') && (
              <button onClick={() => setActiveTab('Card')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'Card' ? 'bg-amarelo-gol text-black' : 'text-amarelo-gol border border-amarelo-gol/30 hover:bg-amarelo-gol/10'}`}>
                <ImageIcon size={18} /> O Card
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white shrink-0 ml-4 bg-[var(--bg-surface)] p-2 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* TAB: PARTIDA */}
          {activeTab === 'Partida' && (
            <>
              <div className="flex-[2] p-4 sm:p-8 flex flex-col overflow-y-auto border-b md:border-b-0 md:border-r border-[var(--border-color)]">
                {tournamentPhase !== 'Eliminado' && tournamentPhase !== 'Campeão' && currentOpponent ? (
                  <>
                    <div className="text-center mb-8">
                      <div className="text-amarelo-gol font-display text-2xl tracking-wide uppercase">
                        <Trophy size={20} className="inline mr-2" /> 
                        {tournamentPhase === 'Grupos' ? `FASE DE GRUPOS - RODADA ${currentRound}` : tournamentPhase}
                      </div>
                    </div>

                    <div className="w-full flex flex-row justify-between items-center mb-6 sm:mb-10 gap-2 sm:gap-4">
                      <div className="text-center flex-1 min-w-0">
                        <div className="text-[10px] sm:text-sm text-[var(--text-secondary)] font-bold mb-1 tracking-wider">SUA SELEÇÃO</div>
                        <div className="text-xl sm:text-4xl font-display text-[var(--text-primary)] truncate">Você</div>
                        <div className="text-[10px] sm:text-sm font-mono mt-1 sm:mt-2 text-verde-grama bg-verde-grama/10 inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-verde-grama/20">OVR {teamOverall}</div>
                        {penaltyPhase && renderPenaltyDots(penaltiesHistory.player)}
                      </div>
                      
                      <div className="flex flex-col items-center shrink-0">
                        <div className="text-4xl sm:text-6xl font-display text-[var(--text-primary)] px-4 sm:px-6 bg-[var(--bg-background)] rounded-xl border border-[var(--border-color)] py-2 sm:py-3 shadow-inner">
                          {score.player} - {score.opponent}
                        </div>
                        {penaltyPhase && (
                          <div className="text-lg sm:text-2xl font-bold text-amarelo-gol mt-2 sm:mt-3 bg-amarelo-gol/10 px-2 sm:px-4 py-1 rounded-lg border border-amarelo-gol/30">
                            ({penaltyScore.player}) - ({penaltyScore.opponent})
                          </div>
                        )}
                      </div>

                      <div className="text-center flex-1 min-w-0">
                        <div className="text-[10px] sm:text-sm text-[var(--text-secondary)] font-bold mb-1 tracking-wider">{currentOpponent.year}</div>
                        <div className="text-xl sm:text-4xl font-display text-[var(--text-primary)] uppercase truncate">{currentOpponent.name}</div>
                        <div className="text-[10px] sm:text-sm font-mono mt-1 sm:mt-2 text-vermelho-erro bg-vermelho-erro/10 inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-vermelho-erro/20">OVR {currentOpponent.ovr}</div>
                        {penaltyPhase && renderPenaltyDots(penaltiesHistory.opponent)}
                      </div>
                    </div>

                    <div className="text-center mb-2 mt-auto">
                      {penaltyPhase ? (
                        <div className="text-4xl sm:text-7xl text-amarelo-gol animate-pulse font-display tracking-widest mb-4">
                          PÊNALTIS
                        </div>
                      ) : (
                        <div className="text-5xl sm:text-7xl font-mono mb-4 text-[var(--text-secondary)]">
                          {minute}'
                        </div>
                      )}
                      
                      {!isPlaying && !matchEnded && (
                        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                          <div className="flex justify-center gap-2 mb-2 bg-[var(--bg-background)] p-1 rounded-full border border-[var(--border-color)]">
                            <button onClick={() => setSpeed('normal')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${speed === 'normal' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Normal</button>
                            <button onClick={() => setSpeed('rápida')} className={`flex-1 py-2 text-sm font-bold rounded-full flex items-center justify-center gap-1 transition-colors ${speed === 'rápida' ? 'bg-white text-black' : 'text-[var(--text-secondary)] hover:text-white'}`}><FastForward size={14} /> Rápida</button>
                          </div>
                          <button onClick={startMatch} className="w-full py-5 bg-verde-grama text-black font-bold text-xl rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            <Play size={24} /> INICIAR PARTIDA
                          </button>
                        </div>
                      )}

                      {matchEnded && !isPlaying && (
                        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto text-center mt-8">
                          <div className={`text-3xl font-display mb-4 ${score.player > score.opponent || penaltyScore.player > penaltyScore.opponent ? 'text-verde-grama' : score.player < score.opponent || penaltyScore.player < penaltyScore.opponent ? 'text-vermelho-erro' : 'text-[var(--text-primary)]'}`}>
                            {score.player > score.opponent || penaltyScore.player > penaltyScore.opponent ? 'VITÓRIA!' : score.player < score.opponent || penaltyScore.player < penaltyScore.opponent ? 'DERROTA...' : 'EMPATE'}
                          </div>
                          <button onClick={nextMatch} className="w-full py-4 bg-amarelo-gol text-black font-bold text-xl rounded-xl hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                            AVANÇAR PARA A PRÓXIMA FASE
                          </button>
                        </div>
                      )}
                    </div>

                    {/* TABELA DE CLASSIFICAÇÃO (Apenas na Fase de Grupos) */}
                    {tournamentPhase === 'Grupos' && (
                      <div className="mt-2 max-w-3xl mx-auto w-full bg-[var(--bg-background)] p-3 rounded-xl border border-[var(--border-color)]">
                        <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex items-center gap-2">
                          <List size={14} className="text-amarelo-gol" /> Classificação do Grupo
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex text-[9px] font-mono text-[var(--text-secondary)] px-3 uppercase pb-1 border-b border-[var(--border-color)]">
                            <div className="w-6">#</div>
                            <div className="flex-1">Seleção</div>
                            <div className="w-10 text-center font-bold text-white">PTS</div>
                            <div className="w-8 text-center hidden sm:block">J</div>
                            <div className="w-8 text-center hidden sm:block">V</div>
                            <div className="w-8 text-center hidden sm:block">E</div>
                            <div className="w-8 text-center hidden sm:block">D</div>
                            <div className="w-10 text-center">SG</div>
                          </div>
                          {displayStandings.map((team, idx) => (
                            <motion.div 
                              layout
                              transition={{ type: "spring", stiffness: 120, damping: 15, mass: 0.8 }}
                              key={team.id} 
                              className={`flex items-center text-xs px-3 py-2 rounded-lg border transition-all ${team.isPlayer ? 'bg-amarelo-gol/10 border-amarelo-gol/30 shadow-[inset_0_0_10px_rgba(234,179,8,0.1)]' : 'bg-[var(--bg-surface)] border-[var(--border-color)]'} ${idx < 2 ? 'border-l-4 border-l-verde-grama' : 'border-l-4 border-l-vermelho-erro/50 opacity-80'}`}
                            >
                              <div className="w-5 font-mono text-[var(--text-secondary)] font-bold">{idx + 1}</div>
                              <div className="flex-1 font-bold flex items-center gap-2 truncate text-[var(--text-primary)] uppercase">
                                {team.name}
                                {team.isPlayer && <span className="text-[8px] bg-amarelo-gol text-black px-1 py-0.5 rounded font-mono uppercase tracking-widest hidden sm:inline-block">Você</span>}
                              </div>
                              <div className="w-8 text-center font-display text-lg text-amarelo-gol">{team.pts}</div>
                              <div className="w-6 text-center font-mono text-[var(--text-secondary)] hidden sm:block">{team.pld}</div>
                              <div className="w-6 text-center font-mono text-[var(--text-secondary)] hidden sm:block">{team.win}</div>
                              <div className="w-6 text-center font-mono text-[var(--text-secondary)] hidden sm:block">{team.draw}</div>
                              <div className="w-6 text-center font-mono text-[var(--text-secondary)] hidden sm:block">{team.loss}</div>
                              <div className="w-8 text-center font-mono font-bold text-[var(--text-primary)]">{team.gd > 0 ? `+${team.gd}` : team.gd}</div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <p className="text-[var(--text-secondary)] text-xl">Nenhuma partida em andamento.</p>
                    <button onClick={() => setActiveTab('Card')} className="mt-6 px-8 py-3 bg-amarelo-gol text-black font-bold rounded-xl hover:bg-yellow-400">Ver Resumo da Copa</button>
                  </div>
                )}
              </div>

              {/* Match Logs Sidebar */}
              <div className="flex-1 md:flex-none md:w-80 lg:w-96 bg-[var(--bg-background)] p-4 sm:p-6 flex flex-col border-l border-[var(--border-color)] overflow-y-auto">
                <h3 className="font-bold text-[var(--text-secondary)] mb-6 uppercase text-sm border-b border-[var(--border-color)] pb-3 tracking-widest">Lances da Partida</h3>
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
                  {matchLog.map((log, i) => (
                    <div key={i} className={`p-4 rounded-xl text-sm font-medium leading-relaxed ${log.includes('GOL!') ? 'bg-amarelo-gol text-black shadow-[0_0_15px_rgba(234,179,8,0.2)]' : log.includes('DEFESA') || log.includes('TRAVE') ? 'bg-vermelho-erro/20 text-red-500 border border-vermelho-erro/30' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>
                      {log}
                    </div>
                  ))}
                  {matchLog.length === 0 && !isPlaying && (
                    <div className="text-center text-[var(--text-secondary)] text-sm mt-10">Aguardando início do jogo...</div>
                  )}
                </div>
              </div>
            </>
          )}

           {/* TAB: CAMPANHA (Histórico) */}
          {activeTab === 'Campanha' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[var(--bg-background)]">
              <h2 className="text-2xl sm:text-3xl font-display text-[var(--text-primary)] mb-6 sm:mb-8">Sua Campanha</h2>
              
              {pastMatches.length === 0 ? (
                <p className="text-[var(--text-secondary)]">Nenhuma partida disputada ainda.</p>
              ) : (
                <div className="flex flex-col gap-4 sm:gap-6">
                  {pastMatches.map((match) => {
                    const isWin = match.playerGoals > match.opponentGoals || (match.penaltyScore && match.penaltyScore.player > match.penaltyScore.opponent);
                    const isLoss = match.playerGoals < match.opponentGoals || (match.penaltyScore && match.penaltyScore.player < match.penaltyScore.opponent);
                    
                    return (
                      <div key={match.id} className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-4 text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          <span>{match.phase}</span>
                          {isWin && <span className="text-verde-grama">VITÓRIA ✓</span>}
                          {isLoss && <span className="text-vermelho-erro">DERROTA ✕</span>}
                          {!isWin && !isLoss && <span>EMPATE -</span>}
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 text-right text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">Você</div>
                          <div className="px-2 sm:px-8 flex flex-col items-center shrink-0">
                            <div className="text-2xl sm:text-4xl font-display text-[var(--text-primary)] bg-[var(--bg-background)] px-3 sm:px-4 py-1 sm:py-2 rounded-lg border border-[var(--border-color)] tracking-widest">
                              {match.playerGoals} - {match.opponentGoals}
                            </div>
                            {match.penaltyScore && (
                              <div className="text-amarelo-gol text-xs sm:text-sm font-bold mt-2">
                                PÊN: ({match.penaltyScore.player}) - ({match.penaltyScore.opponent})
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left text-xl font-bold uppercase">{match.opponent.name} '{match.opponent.year}</div>
                        </div>

                        {/* Scorers */}
                        <div className="mt-4 flex justify-between text-xs text-[var(--text-secondary)]">
                          <div className="flex-1 text-right pr-6">
                            {match.playerScorers.length > 0 ? `⚽ ${match.playerScorers.join(', ')}` : ''}
                          </div>
                          <div className="w-32"></div>
                          <div className="flex-1 text-left pl-6">
                            {match.opponentScorers.length > 0 ? `⚽ ${match.opponentScorers.join(', ')}` : ''}
                          </div>
                        </div>

                        {/* Penalty Details */}
                        {match.penaltyDetails && (
                          <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-between">
                            <div className="flex-1 flex flex-col gap-2 items-end pr-6">
                              {match.penaltyDetails.player.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                                  <span className={`w-3 h-3 rounded-full ${p.isGoal ? 'bg-verde-grama' : 'bg-vermelho-erro'}`}></span>
                                </div>
                              ))}
                            </div>
                            <div className="w-px bg-[var(--border-color)]"></div>
                            <div className="flex-1 flex flex-col gap-2 items-start pl-6">
                              {match.penaltyDetails.opponent.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span className={`w-3 h-3 rounded-full ${p.isGoal ? 'bg-verde-grama' : 'bg-vermelho-erro'}`}></span>
                                  <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: O CARD FINAL */}
          {activeTab === 'Card' && (
            <div className="flex-1 overflow-y-auto bg-[var(--bg-background)]">
              <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-full">
              
                <div 
                  ref={cardRef}
                  className="w-full max-w-4xl border border-amarelo-gol/50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.15)] bg-[#0a0f0a]"
                >
                  {/* Layout Responsivo: Vertical no mobile, Horizontal no PC */}
                  <div className="flex flex-col md:flex-row">
                    
                    {/* Lado Esquerdo - Info */}
                    <div className="w-full md:w-[320px] shrink-0 flex flex-col justify-between bg-gradient-to-b from-[#0a0f0a] to-[#111] border-b md:border-b-0 md:border-r border-amarelo-gol/20 p-6 md:p-8 text-center md:text-left">
                      
                      <div>
                        <div className="mb-6 flex flex-col items-center md:items-start gap-2">
                          <img src="/logo.png" alt="ENTROSA" className="w-32 md:w-24 h-auto drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
                          <div className="text-amarelo-gol/60 font-mono text-xs font-bold tracking-[0.3em] uppercase">COPA ENTROSA</div>
                        </div>
                        
                        <div className={`text-4xl font-display mb-1 tracking-wide ${tournamentPhase === 'Campeão' ? 'text-amarelo-gol drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'text-vermelho-erro drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>
                          {tournamentPhase === 'Campeão' ? 'CAMPEÃO!' : 'ELIMINADO'}
                        </div>
                        <div className="text-xs text-white/40 font-bold tracking-[0.2em] uppercase mb-8">
                          {tournamentPhase === 'Campeão' ? 'A GLÓRIA ETERNA' : `CAIU NA FASE: ${eliminatedPhase}`}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Overall</span>
                            <span className="text-3xl font-display text-amarelo-gol">{teamOverall}</span>
                          </div>
                          <div className="h-px bg-white/10"></div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Gols Pró</span>
                            <span className="text-3xl font-display text-verde-grama">{totalGoalsFor}</span>
                          </div>
                          <div className="h-px bg-white/10"></div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Sofridos</span>
                            <span className="text-3xl font-display text-vermelho-erro">{totalGoalsAgainst}</span>
                          </div>
                          <div className="h-px bg-white/10"></div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Vitórias</span>
                            <span className="text-3xl font-display text-white">{totalWins}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <span className="text-xs text-white/30 font-mono tracking-widest">entrosa.app</span>
                      </div>
                    </div>

                    {/* Lado Direito - Escalação */}
                    <div className="flex-1 bg-[#124d29] relative p-4 sm:p-5 min-h-[400px] md:min-h-auto flex flex-col justify-center">
                      {/* Linhas do campo */}
                      <div className="absolute inset-0 pointer-events-none opacity-10">
                        <div className="absolute inset-3 border-2 border-white"></div>
                        <div className="absolute top-1/2 left-3 right-3 h-px bg-white"></div>
                        <div className="absolute w-20 h-20 border-2 border-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                      </div>
                      
                      <div className="relative z-10 flex flex-col gap-2 sm:gap-3 h-full justify-between">
                        {nodes2D.map((row, ri) => (
                          <div key={ri} className="flex flex-row justify-center gap-1.5 sm:gap-3">
                            {row.map((node, ci) => (
                              <div key={`${ri}-${ci}`} className="relative flex flex-col items-center bg-[#0d3d1f] border border-[#1D9E75]/50 rounded-lg px-2 sm:px-4 py-1 sm:py-1.5 min-w-[70px] sm:min-w-[110px] shadow-lg">
                                {node.playerOvr && (
                                  <span className="absolute -top-1.5 -right-1.5 z-20 bg-amarelo-gol text-black text-[9px] sm:text-[10px] font-mono font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-md">{node.playerOvr}</span>
                                )}
                                <span className="text-[9px] sm:text-[10px] font-mono text-white/50 uppercase tracking-wider mb-0.5 z-10 absolute top-0.5 left-1">{node.position}</span>
                                
                                {node.faceUrl ? (
                                  <img src={`/api/image?url=${encodeURIComponent(node.faceUrl)}`} alt={node.playerName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain mt-1 drop-shadow-md z-10" />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 mt-1 rounded-full bg-verde-grama flex items-center justify-center text-white font-display text-base border border-amarelo-gol/50 z-10">
                                    {node.playerName?.charAt(0) || '—'}
                                  </div>
                                )}
                                
                                <span className="text-xs sm:text-sm mt-1 font-display text-white uppercase leading-tight truncate w-full max-w-[65px] sm:max-w-[100px] text-center font-bold z-20">{node.playerName || '—'}</span>
                                {node.playerCountry && (
                                  <span className="mt-0.5 text-[8px] sm:text-[9px] font-bold text-white/70 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-sm uppercase tracking-wide z-20">{node.playerCountry.substring(0,3)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      
                      {/* Watermark in the bottom right corner of the field */}
                      <div className="absolute bottom-3 right-4 opacity-40 pointer-events-none flex flex-col items-end gap-1">
                        <img src="/logo.png" alt="ENTROSA" className="h-5 w-auto grayscale" />
                        <span className="font-mono text-[8px] text-white tracking-widest font-bold">entrosa.app</span>
                      </div>
                    </div>

                  </div>
                </div>

                <button 
                  onClick={handleDownloadCard}
                  className="mt-6 mb-4 px-8 py-3 bg-amarelo-gol text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center gap-3"
                >
                  <Download size={20} />
                  SALVAR IMAGEM
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
