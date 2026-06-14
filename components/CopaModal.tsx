import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Trophy, Swords, Users, FastForward, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { SaveManager, EntrosaSave } from '@/lib/saveManager';
import { Field, FormationNode } from '@/components/Field';
import html2canvas from 'html2canvas';

import { 
  LeagueTeam, 
  LeagueMatch, 
  simulateLeagueMatch,
  getStandings
} from '@/lib/leagueSimulation';
import { 
  CopaState, 
  generateCopaGroupMatches, 
  generateCopaKnockout, 
  advanceKnockoutPhase, 
  simulateCopaKnockoutMatch 
} from '@/lib/copaSimulation';

interface CopaModalProps {
  onClose: () => void;
  playerTeam: any[];
  teamOverall: number;
  nodes2D: FormationNode[][];
  league?: 'worldcup' | 'brasileirao';
  customTeamName?: string;
  loadedSave?: Partial<EntrosaSave> | null;
}

export function CopaModal({ onClose, playerTeam, teamOverall, nodes2D, league = 'worldcup', customTeamName, loadedSave }: CopaModalProps) {
  const [copaState, setCopaState] = useState<CopaState | null>(null);
  const [activeTab, setActiveTab] = useState<'TABELA' | 'PARTIDAS' | 'MATA-MATA' | 'ELENCO'>('TABELA');
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [isVisualSimulating, setIsVisualSimulating] = useState(false);
  const [matchMinute, setMatchMinute] = useState(0);
  
  const [showSummary, setShowSummary] = useState(false);
  const [simSpeed, setSimSpeed] = useState(50); // ms por minuto (50ms * 90 = ~4.5s)
  
  const cardRef = useRef<HTMLDivElement>(null);
  
  const PLAYER_ID = 'player';
  const playerNamesArray = nodes2D.flat().filter(n => n.playerName).map(n => n.playerName) as string[];
  const playerPositionsArray = nodes2D.flat().filter(n => n.playerName).map(n => n.position) as string[];

  // Initialization
  useEffect(() => {
    if (loadedSave?.competition_state?.groups) {
      // É um save novo, no formato CopaState
      setCopaState(loadedSave.competition_state as CopaState);
      if (loadedSave.competition_state.currentRound >= 7 || loadedSave.competition_state.tournamentPhase === 'Eliminado') {
        setShowSummary(true);
      }
      return;
    }

    // Inicialização do zero
    const fetchOpponents = async () => {
      const url = league ? `/api/opponents?league=${league}` : '/api/opponents';
      const res = await fetch(url);
      const data = await res.json();
      
      const playerT: LeagueTeam = {
        id: PLAYER_ID, 
        name: customTeamName || 'Você', 
        year: new Date().getFullYear(),
        ovr: teamOverall, 
        playerNames: playerNamesArray,
        positionCodes: playerPositionsArray,
        isRealPlayer: true,
        stats: { pts: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 }
      };

      const cpus: LeagueTeam[] = data.map((d: any, i: number) => ({
        id: `cpu-${i+1}`,
        name: d.teamName,
        year: d.tournamentYear,
        ovr: d.averageOverall,
        playerNames: d.playerNames || [],
        positionCodes: d.playerPositions || [],
        isRealPlayer: false,
        stats: { pts: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 }
      })).slice(0, 31); // Pega 31 times
      
      const allTeams = [playerT, ...cpus];
      
      // Shuffle teams
      for (let i = allTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTeams[i], allTeams[j]] = [allTeams[j], allTeams[i]];
      }

      const { groups, matches } = generateCopaGroupMatches(allTeams);

      const initialState: CopaState = {
        version: 2,
        currentRound: 0,
        totalRounds: 7, // 3 grupos + 4 mata
        teams: allTeams,
        matches,
        scorersMap: {},
        groups,
        knockoutBrackets: []
      };

      setCopaState(initialState);
    };

    fetchOpponents();
  }, [teamOverall]);

  // Save to SaveManager effect
  useEffect(() => {
    if (!copaState || isVisualSimulating) return;

    const isFinished = copaState.currentRound === 7 || isPlayerEliminated(copaState);
    
    SaveManager.saveLocally({
      save_name: `Copa - ${customTeamName || 'Seu Time'}`,
      mode: 'worldcup',
      status: isFinished ? 'finished' : 'in_progress',
      custom_team_name: customTeamName || 'Seu Time',
      team_overall: teamOverall,
      nodes_2d: nodes2D,
      is_champion: isPlayerChampion(copaState),
      competition_state: {
        ...copaState,
        tournamentPhase: isFinished ? (isPlayerChampion(copaState) ? 'Campeão' : 'Eliminado') : (copaState.currentRound < 3 ? 'Grupos' : 'Mata-Mata')
      } as any
    });

    SaveManager.syncToCloud('worldcup');
  }, [copaState?.currentRound, isVisualSimulating]);

  const isPlayerEliminated = (state: CopaState) => {
    if (state.currentRound < 3) return false;
    
    const playerGrp = Object.entries(state.groups).find(([g, ids]) => ids.includes(PLAYER_ID));
    if (!playerGrp) return true;
    
    const grpTeams = state.groups[playerGrp[0]].map(id => state.teams.find(t => t.id === id)!);
    const standings = getStandings(grpTeams);
    const playerRank = standings.findIndex(t => t.id === PLAYER_ID);
    
    if (state.currentRound === 3 && playerRank > 1) return true; // Eliminado nos grupos
    
    if (state.currentRound >= 4) {
      // Se estamos no mata-mata, o player só está vivo se ele tiver uma partida na próxima rodada ou se for a atual
      const isAlive = state.matches.some(m => m.round === state.currentRound + 1 && (m.homeId === PLAYER_ID || m.awayId === PLAYER_ID));
      const hasMatchInCurrent = state.matches.some(m => m.round === state.currentRound && (m.homeId === PLAYER_ID || m.awayId === PLAYER_ID));
      
      if (!isAlive && !hasMatchInCurrent) return true; // Caiu em rodadas anteriores
      
      // Se a rodada já simulou e ele perdeu
      const playerMatch = state.matches.find(m => m.round === state.currentRound && (m.homeId === PLAYER_ID || m.awayId === PLAYER_ID));
      if (playerMatch?.simulated) {
        if (playerMatch.penalties) {
          if (playerMatch.homeId === PLAYER_ID && playerMatch.penalties.winner !== 'player') return true;
          if (playerMatch.awayId === PLAYER_ID && playerMatch.penalties.winner !== 'opponent') return true;
        } else {
          if (playerMatch.homeId === PLAYER_ID && playerMatch.awayGoals! > playerMatch.homeGoals!) return true;
          if (playerMatch.awayId === PLAYER_ID && playerMatch.homeGoals! > playerMatch.awayGoals!) return true;
        }
      }
    }
    return false;
  };

  const isPlayerChampion = (state: CopaState) => {
    if (state.currentRound < 7) return false;
    const finalMatch = state.matches.find(m => m.round === 7);
    if (!finalMatch || !finalMatch.simulated) return false;
    if (finalMatch.homeId !== PLAYER_ID && finalMatch.awayId !== PLAYER_ID) return false;
    
    if (finalMatch.penalties) {
      return (finalMatch.homeId === PLAYER_ID && finalMatch.penalties.winner === 'player') || (finalMatch.awayId === PLAYER_ID && finalMatch.penalties.winner === 'opponent');
    }
    return (finalMatch.homeId === PLAYER_ID && finalMatch.homeGoals! > finalMatch.awayGoals!) || (finalMatch.awayId === PLAYER_ID && finalMatch.awayGoals! > finalMatch.homeGoals!);
  };

  const simulateRound = () => {
    if (!copaState || isSimulating || copaState.currentRound >= 7) return;
    setIsSimulating(true);

    const roundToSimulate = copaState.currentRound + 1;
    const newMatches = [...copaState.matches];
    const newTeams = copaState.teams.map(t => ({ ...t, stats: { ...t.stats } }));
    
    let isKnockout = roundToSimulate >= 4;

    newMatches.forEach((m, idx) => {
      if (m.round === roundToSimulate && !m.simulated) {
        const home = newTeams.find(t => t.id === m.homeId)!;
        const away = newTeams.find(t => t.id === m.awayId)!;

        const result = isKnockout ? simulateCopaKnockoutMatch(home, away) : simulateLeagueMatch(home, away);

        // Atualizar stats dos times para fase de grupos
        if (!isKnockout) {
          home.stats.gf += result.playerGoals;
          home.stats.ga += result.opponentGoals;
          home.stats.sg = home.stats.gf - home.stats.ga;

          away.stats.gf += result.opponentGoals;
          away.stats.ga += result.playerGoals;
          away.stats.sg = away.stats.gf - away.stats.ga;

          if (result.playerGoals > result.opponentGoals) {
            home.stats.pts += 3; home.stats.v += 1; away.stats.d += 1;
          } else if (result.playerGoals < result.opponentGoals) {
            away.stats.pts += 3; away.stats.v += 1; home.stats.d += 1;
          } else {
            home.stats.pts += 1; away.stats.pts += 1; home.stats.e += 1; away.stats.e += 1;
          }
        }

        newMatches[idx] = {
          ...m,
          simulated: true,
          homeGoals: result.playerGoals,
          awayGoals: result.opponentGoals,
          homeScorers: result.events.filter(e => e.team === 'player' && e.type === 'goal').map(e => e.scorerName!),
          awayScorers: result.events.filter(e => e.team === 'opponent' && e.type === 'goal').map(e => e.scorerName!),
          events: result.events,
          penalties: result.penalties
        };
      }
    });

    // Se for rodada 3, gerar os confrontos das Oitavas
    if (roundToSimulate === 3) {
      const oitavas = generateCopaKnockout(copaState.groups, newTeams);
      newMatches.push(...oitavas);
    }

    // Se for mata-mata e não for final, gerar a próxima chave
    if (roundToSimulate >= 4 && roundToSimulate < 7) {
      const nextPhase = advanceKnockoutPhase(roundToSimulate, newMatches);
      newMatches.push(...nextPhase);
    }

    setCopaState({
      ...copaState,
      currentRound: roundToSimulate,
      teams: newTeams,
      matches: newMatches
    });
    
    setMatchMinute(0);
    setIsVisualSimulating(true);
    if (activeTab !== 'PARTIDAS') setActiveTab('PARTIDAS');
  };

  const saveDraftStats = async (isChampion: boolean) => {
    if (!copaState) return;
    
    // Sum all goals scored and conceded by the player in all matches
    const playerMatches = copaState.matches.filter(m => m.simulated && (m.homeId === PLAYER_ID || m.awayId === PLAYER_ID));
    
    let tGoals = 0;
    let tConceded = 0;
    
    playerMatches.forEach(m => {
      if (m.homeId === PLAYER_ID) {
        tGoals += m.homeGoals || 0;
        tConceded += m.awayGoals || 0;
      } else {
        tGoals += m.awayGoals || 0;
        tConceded += m.homeGoals || 0;
      }
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) return;

      const userId = session.user.id;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      let profileData = profile;
      if (!profileData) {
        profileData = {
          id: userId,
          name: session.user.user_metadata?.full_name || 'Anônimo',
          avatar_url: session.user.user_metadata?.avatar_url || ''
        };
      }

      const newWins = (profileData.draft_tournaments_won || 0) + (isChampion ? 1 : 0);
      const newOvr = Math.max(profileData.draft_highest_overall || 0, teamOverall);
      const newTotalGoals = (profileData.draft_total_goals || 0) + tGoals;
      const newTotalConceded = (profileData.draft_goals_conceded || 0) + tConceded;
      const newTotalDrafts = (profileData.draft_total_matches || 0) + 1; // 1 Draft Jogado

      const { error } = await supabase.from('profiles').upsert({
        ...profileData,
        draft_tournaments_won: newWins,
        draft_highest_overall: newOvr,
        draft_total_goals: newTotalGoals,
        draft_goals_conceded: newTotalConceded,
        draft_total_matches: newTotalDrafts
      }, { onConflict: 'id' });

      if (error) console.error("Error saving draft stats to Supabase:", error);
    } catch (e) {
      console.error(e);
    }
  };

  // Timer da simulação visual
  useEffect(() => {
    if (isVisualSimulating && copaState) {
      const currentMatches = copaState.matches.filter(m => m.round === copaState.currentRound);
      const hasPenalties = currentMatches.some(m => m.penalties);
      const maxMinute = hasPenalties ? 120 : 90;

      const interval = setInterval(() => {
        setMatchMinute(prev => {
          if (prev >= maxMinute) {
            clearInterval(interval);
            setIsVisualSimulating(false);
            setIsSimulating(false);
            
            // Check se eliminou ou ganhou pra mostrar o summary
            if (copaState.currentRound === 7 || isPlayerEliminated(copaState)) {
              saveDraftStats(isPlayerChampion(copaState));
              setTimeout(() => setShowSummary(true), 2000);
            }
            return maxMinute;
          }
          return prev + 2; // +2 min por tick pra ser rápido
        });
      }, simSpeed);

      return () => clearInterval(interval);
    }
  }, [isVisualSimulating, simSpeed, copaState]);

  if (!copaState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-white text-xl animate-pulse font-display tracking-widest text-amarelo-gol">Sorteando Grupos...</div>
      </div>
    );
  }

  const { currentRound, totalRounds, matches, teams, groups } = copaState;
  const currentRoundMatches = matches.filter(m => m.round === (isVisualSimulating ? currentRound : currentRound + 1));
  const hasPlayerMatch = currentRoundMatches.some(m => m.homeId === PLAYER_ID || m.awayId === PLAYER_ID);

  const formatScorers = (scorers: string[]) => {
    if (!scorers || scorers.length === 0) return '';
    const counts = scorers.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count]) => count > 1 ? `${name} (${count})` : name).join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f110f] font-sans text-white h-[100dvh] overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col bg-[#161a16] border-b border-white/10 shrink-0 z-20">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amarelo-gol" />
            <h2 className="font-display text-sm tracking-widest text-white/80">
              COPA MULTIPLAYER <span className="text-xs font-mono text-white/40 ml-2">SIMULAÇÃO</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col px-4 py-3 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button 
                disabled={currentRound >= totalRounds || isVisualSimulating || showSummary}
                onClick={simulateRound}
                className="flex items-center gap-2 h-10 px-5 bg-amarelo-gol text-black rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-yellow-400 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              >
                <FastForward size={16} fill="currentColor" /> SIMULAR RODADA
              </button>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono">
                {currentRound === 0 ? 'Início' : 
                 currentRound <= 3 ? `Fase de Grupos (Rodada ${currentRound})` :
                 currentRound === 4 ? 'Oitavas de Final' :
                 currentRound === 5 ? 'Quartas de Final' :
                 currentRound === 6 ? 'Semifinal' : 'Final'}
              </div>
            </div>
          </div>
          
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
            <div className="h-full bg-amarelo-gol transition-all duration-300" style={{ width: `${(currentRound / totalRounds) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto relative pb-16 custom-scrollbar">
        
        {/* TABELA */}
        {activeTab === 'TABELA' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groups).map(([groupName, teamIds]) => {
              const groupTeams = teamIds.map(id => teams.find(t => t.id === id)!);
              const standings = getStandings(groupTeams);
              
              return (
                <div key={groupName} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center gap-2">
                    <span className="text-amarelo-gol font-display text-lg">GRUPO {groupName}</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40">
                        <th className="py-2 px-3 text-left w-6">#</th>
                        <th className="py-2 px-2 text-left">Time</th>
                        <th className="py-2 px-2 text-center w-8 font-bold text-white/70">P</th>
                        <th className="py-2 px-2 text-center w-8">J</th>
                        <th className="py-2 px-2 text-center w-8">V</th>
                        <th className="py-2 px-2 text-center w-8">E</th>
                        <th className="py-2 px-2 text-center w-8">D</th>
                        <th className="py-2 px-2 text-center w-8">SG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((t, i) => (
                        <tr key={t.id} className={`border-b border-white/5 last:border-0 ${t.id === PLAYER_ID ? 'bg-amarelo-gol/10 text-amarelo-gol font-bold' : 'text-white/80'} ${i < 2 ? 'border-l-2 border-l-verde-grama' : 'border-l-2 border-l-transparent'}`}>
                          <td className="py-2.5 px-3 text-white/40">{i + 1}</td>
                          <td className="py-2.5 px-2 font-medium truncate max-w-[120px]">{t.name}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-white">{t.stats.pts}</td>
                          <td className="py-2.5 px-2 text-center opacity-70">{t.stats.v + t.stats.e + t.stats.d}</td>
                          <td className="py-2.5 px-2 text-center opacity-70">{t.stats.v}</td>
                          <td className="py-2.5 px-2 text-center opacity-70">{t.stats.e}</td>
                          <td className="py-2.5 px-2 text-center opacity-70">{t.stats.d}</td>
                          <td className="py-2.5 px-2 text-center opacity-70">{t.stats.sg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* PARTIDAS */}
        {activeTab === 'PARTIDAS' && (
          <div className="p-4 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Swords size={14} className="text-amarelo-gol" /> 
              {isVisualSimulating ? `Partidas em Andamento` : `Próximos Confrontos`}
            </h3>
            
            <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
              {currentRoundMatches.map((m, idx) => {
                const home = teams.find(t => t.id === m.homeId)!;
                const away = teams.find(t => t.id === m.awayId)!;
                
                const isPlayerMatch = (home.id === PLAYER_ID || away.id === PLAYER_ID);
                const isLive = isVisualSimulating && isPlayerMatch;

                let displayHomeGoals = m.homeGoals;
                let displayAwayGoals = m.awayGoals;
                let displayHomeScorers = m.homeScorers;
                let displayAwayScorers = m.awayScorers;

                if (isLive && m.events) {
                  const liveEvents = m.events.filter((e: any) => e.minute <= matchMinute);
                  displayHomeGoals = liveEvents.filter((e: any) => e.type === 'goal' && e.team === 'player').length;
                  displayAwayGoals = liveEvents.filter((e: any) => e.type === 'goal' && e.team === 'opponent').length;
                  displayHomeScorers = liveEvents.filter((e: any) => e.type === 'goal' && e.team === 'player').map((e:any) => e.scorerName!);
                  displayAwayScorers = liveEvents.filter((e: any) => e.type === 'goal' && e.team === 'opponent').map((e:any) => e.scorerName!);
                }

                return (
                  <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 bg-black/40 opacity-70 hover:opacity-100 transition-opacity ${isLive ? 'border-amarelo-gol shadow-[0_0_15px_rgba(234,179,8,0.2)]' : isPlayerMatch ? 'border-white/30 bg-white/5' : 'border-white/10'}`}>
                    {isLive && (
                      <div className="text-center w-full mb-[-10px]">
                        <span className="text-[10px] text-amarelo-gol animate-pulse font-bold tracking-widest inline-flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded-full border border-amarelo-gol/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amarelo-gol"></span>
                          {matchMinute}'
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex flex-col items-end">
                        <span className={`text-xs font-bold uppercase truncate ${home.id === PLAYER_ID ? 'text-amarelo-gol' : 'text-white/70'}`}>{home.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">'{String(home.year).slice(-2)} OVR {home.ovr}</span>
                      </div>
                      
                      <div className="px-4">
                        <div className={`bg-black/80 px-4 py-2 rounded-lg font-display text-xl flex items-center gap-3 border min-w-[90px] justify-center shadow-inner ${isLive ? 'border-amarelo-gol/50' : 'border-white/10'}`}>
                          {m.simulated || isLive ? (
                            <>
                              <span className={displayHomeGoals! > displayAwayGoals! ? 'text-amarelo-gol' : 'text-white'}>{displayHomeGoals ?? '-'}</span>
                              <span className={`${isLive ? 'text-amarelo-gol/50 animate-pulse' : 'text-white/20'} text-sm`}>X</span>
                              <span className={displayAwayGoals! > displayHomeGoals! ? 'text-amarelo-gol' : 'text-white'}>{displayAwayGoals ?? '-'}</span>
                            </>
                          ) : (
                            <span className="text-white/30 text-sm">vs</span>
                          )}
                        </div>
                        {(m.simulated || isLive) && m.penalties && (matchMinute >= 120 || !isLive) && (
                          <div className="text-[9px] text-center mt-1 text-white/50">
                            Pên: {m.penalties.playerScore}x{m.penalties.opponentScore}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col items-start">
                        <span className={`text-xs font-bold uppercase truncate ${away.id === PLAYER_ID ? 'text-amarelo-gol' : 'text-white/70'}`}>{away.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">'{String(away.year).slice(-2)} OVR {away.ovr}</span>
                      </div>
                    </div>
                    
                    {(m.simulated || isLive) && ((displayHomeScorers?.length || 0) + (displayAwayScorers?.length || 0) > 0) && (
                      <>
                        <div className="h-px bg-white/5 w-full"></div>
                        <div className="flex justify-between text-[9px] text-white/50 uppercase tracking-wider px-2">
                          <div className="flex-1 text-right truncate text-verde-grama/80">{formatScorers(displayHomeScorers || [])}</div>
                          <div className="w-16"></div>
                          <div className="flex-1 text-left truncate text-verde-grama/80">{formatScorers(displayAwayScorers || [])}</div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {currentRoundMatches.length === 0 && (
                <div className="p-8 text-center text-white/40 text-sm">
                  Nenhuma partida nesta fase. Simule para avançar!
                </div>
              )}
            </div>
          </div>
        )}

        {/* MATA-MATA */}
        {activeTab === 'MATA-MATA' && (
          <div className="p-4 flex flex-col gap-6">
            {[4, 5, 6, 7].map(rd => {
              const phaseMatches = matches.filter(m => m.round === rd);
              if (phaseMatches.length === 0) return null;
              
              const title = rd === 4 ? 'Oitavas' : rd === 5 ? 'Quartas' : rd === 6 ? 'Semifinal' : 'Final';
              
              return (
                <div key={rd} className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                  <h4 className="text-amarelo-gol font-display text-sm mb-4">{title}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {phaseMatches.map((m, idx) => {
                      const home = teams.find(t => t.id === m.homeId)!;
                      const away = teams.find(t => t.id === m.awayId)!;
                      const isPl = home.id === PLAYER_ID || away.id === PLAYER_ID;
                      
                      return (
                        <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${isPl ? 'bg-amarelo-gol/5 border-amarelo-gol/30' : 'bg-black/30 border-white/5'}`}>
                          <span className={`w-1/3 truncate text-right ${home.id === PLAYER_ID ? 'text-amarelo-gol font-bold' : 'text-white/70'}`}>{home.name}</span>
                          <div className="w-1/3 flex justify-center items-center gap-2">
                            {m.simulated ? (
                              <span className="font-bold bg-black px-2 py-1 rounded text-white flex gap-1 items-center">
                                {m.homeGoals} x {m.awayGoals}
                                {m.penalties && <span className="text-[8px] text-amarelo-gol ml-1">P</span>}
                              </span>
                            ) : (
                              <span className="text-white/30">vs</span>
                            )}
                          </div>
                          <span className={`w-1/3 truncate text-left ${away.id === PLAYER_ID ? 'text-amarelo-gol font-bold' : 'text-white/70'}`}>{away.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {matches.filter(m => m.round >= 4).length === 0 && (
               <div className="p-8 text-center text-white/40 text-sm">
                 As chaves do mata-mata ainda não foram definidas.
               </div>
            )}
          </div>
        )}

        {/* ELENCO */}
        {activeTab === 'ELENCO' && (
          <div className="p-4 flex flex-col items-center">
            <div className="w-full max-w-sm mb-6">
              <div className="bg-gradient-to-b from-black to-[#1a1f1a] rounded-xl border border-white/10 p-4 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amarelo-gol to-verde-grama"></div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-display text-xl text-white drop-shadow-md">{customTeamName || 'Seu Time'}</h3>
                    <p className="text-xs text-white/50 uppercase tracking-widest">OVR {teamOverall}</p>
                  </div>
                  <div className="w-12 h-12 bg-black/50 border border-white/20 rounded-full flex items-center justify-center shadow-inner">
                    <Trophy size={20} className="text-amarelo-gol" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {playerNamesArray.map((name, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-white/40 font-mono text-[10px] w-8">{playerPositionsArray[i] || 'JOG'}</span>
                      <span className="text-white/90 font-medium flex-1 text-right">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="bg-[#121412] border-t border-white/10 shrink-0 pb-safe">
        <div className="flex items-center justify-between px-2 sm:px-6 py-2">
          
          <button onClick={() => setActiveTab('TABELA')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'TABELA' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Trophy size={20} className={activeTab === 'TABELA' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Grupos</span>
          </button>
          
          <button onClick={() => setActiveTab('MATA-MATA')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'MATA-MATA' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Swords size={20} className={activeTab === 'MATA-MATA' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Chaves</span>
          </button>

          <button onClick={() => setActiveTab('PARTIDAS')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'PARTIDAS' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Play size={20} className={activeTab === 'PARTIDAS' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Jogos</span>
          </button>

          <button onClick={() => setActiveTab('ELENCO')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'ELENCO' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Users size={20} className={activeTab === 'ELENCO' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Elenco</span>
          </button>

        </div>
      </div>

      {/* MODAL DE FIM DE TORNEIO */}
      <AnimatePresence>
        {showSummary && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-start p-4 sm:p-8 py-12 overflow-y-auto custom-scrollbar"
          >
            <div className="w-full max-w-2xl relative flex flex-col items-center mt-8">
              <button onClick={onClose} className="fixed top-4 right-4 sm:top-8 sm:right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[100] shadow-lg backdrop-blur-sm cursor-pointer">
                <X size={24} />
              </button>
              
              <div 
                ref={cardRef}
                className="w-full bg-[#0a0f0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#121612] via-[#0a0f0a] to-[#0a0f0a] pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none"><Trophy size={400} /></div>
                
                <div className="relative z-10 p-6 sm:p-10 flex flex-col items-center text-center border-b border-white/5">
                  <div className="text-amarelo-gol font-mono text-[10px] font-bold tracking-[0.3em] uppercase mb-2">FIM DE TORNEIO</div>
                  <h2 className="text-3xl sm:text-4xl font-display text-white mb-2">{isPlayerChampion(copaState) ? 'CAMPEÃO!' : 'Fim de Jogo!'}</h2>
                  <p className="text-xs sm:text-sm text-white/50 mb-6">{isPlayerEliminated(copaState) ? 'Você foi eliminado do torneio.' : 'O torneio chegou ao fim.'}</p>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-amarelo-gol/10 border border-amarelo-gol/30 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                      <Trophy size={16} className="text-amarelo-gol" />
                      <span className="text-xs sm:text-sm font-bold text-amarelo-gol uppercase">Campanha Finalizada</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 p-6 bg-black/40 flex justify-center gap-4">
                   <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl transition-colors">Fechar</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
