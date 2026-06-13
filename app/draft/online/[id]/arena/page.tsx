"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { X, Play, Trophy, FastForward, List, Pause, SkipForward, User, CheckCircle2, Download, Swords, Users, Home, Settings, ChevronDown, ChevronUp, Zap, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LeagueTeam, 
  LeagueMatch, 
  LeagueScorer, 
  generateRoundRobin, 
  simulateLeagueMatch, 
  getStandings,
  getTopScorers
} from '@/lib/leagueSimulation';
import { Field, FormationNode } from '@/components/Field';
import html2canvas from 'html2canvas';

const generateCpuTeams = async (count: number, leagueId: number = 39): Promise<LeagueTeam[]> => {
  if (count <= 0) return [];
  try {
    const res = await fetch(`/api/league/teams?count=${count}&t=${Date.now()}`);
    const data = await res.json();
    return data.map((t: any, i: number) => ({
      id: `cpu-${i}`,
      name: t.name,
      year: t.year,
      ovr: t.ovr,
      playerNames: t.playerNames,
      positionCodes: t.positionCodes,
      stats: { pts: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 }
    }));
  } catch (err) {
    console.error('Erro ao gerar times IA:', err);
    return [];
  }
};

export default function ArenaOnlinePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { user } = useAuth();
  
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // Novos estados da Arena
  const [activeTab, setActiveTab] = useState<'TABELA' | 'PARTIDAS' | 'ELENCO' | 'HISTORICO' | 'CONFIG'>('TABELA');
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1000);
  const [showFullTable, setShowFullTable] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<FormationNode | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [exportMode, setExportMode] = useState<'story' | 'feed' | null>(null);
  const [matchMinute, setMatchMinute] = useState(90);
  const [isVisualSimulating, setIsVisualSimulating] = useState(false);
  const [processedRound, setProcessedRound] = useState(0);
  const [liveMatchQueue, setLiveMatchQueue] = useState<number[]>([]);
  const [currentLiveRound, setCurrentLiveRound] = useState<number | null>(null);

  // League State (Shared via room.competition_state)
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [scorersMap, setScorersMap] = useState<Record<string, LeagueScorer>>({});

  const cardRef = useRef<HTMLDivElement>(null);
  const currentRoundRef = useRef(currentRound);

  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`draft_player_${roomId}`);
    setLocalPlayerId(storedPlayerId);

    const initArena = async () => {
      const { data: roomData } = await supabase.from('draft_rooms').select('*').eq('id', roomId).single();
      const { data: playersData } = await supabase.from('draft_room_players').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
      
      setRoom(roomData);
      if (playersData) setPlayers(playersData);

      if (roomData?.competition_state) {
        const state = roomData.competition_state;
        setTeams(state.teams || []);
        setMatches(state.matches || []);
        setCurrentRound(state.currentRound || 0);
        setScorersMap(state.scorersMap || {});
      } else if (playersData) {
        const isHost = playersData.find((p: any) => p.id === storedPlayerId)?.is_host;
        if (isHost) {
          const realTeams: LeagueTeam[] = playersData.map((p: any) => {
            const nodes = p.team_json?.flat().filter((n: any) => n.playerName) || [];
            return {
              id: p.id,
              name: p.player_name,
              year: 2024,
              ovr: p.overall || 0,
              playerNames: nodes.map((n: any) => n.playerName),
              positionCodes: nodes.map((n: any) => n.position),
              isRealPlayer: true,
              stats: { pts: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 }
            };
          });

          if (roomData.format === 'liga') {
            const cpuCount = 20 - realTeams.length;
            const cpuTeams = await generateCpuTeams(cpuCount);
            const allTeams = [...realTeams, ...cpuTeams];
            const allMatches = generateRoundRobin(allTeams);

            const initialState = {
              version: 1,
              currentRound: 0,
              totalRounds: (allTeams.length - 1) * 2,
              teams: allTeams,
              matches: allMatches,
              scorersMap: {}
            };

            setTeams(allTeams);
            setMatches(allMatches);
            setCurrentRound(0);

            await supabase.from('draft_rooms').update({ competition_state: initialState }).eq('id', roomId);
          } else if (roomData.format === 'final') {
            const allMatches = [{ round: 1, homeId: realTeams[0].id, awayId: realTeams[1]?.id || 'cpu-1', simulated: false }];
            
            const initialState = {
              version: 1,
              currentRound: 0,
              totalRounds: roomData.settings.twoLegs ? 2 : 1,
              teams: realTeams,
              matches: allMatches,
              scorersMap: {}
            };
            
            setTeams(realTeams);
            setMatches(allMatches);
            setCurrentRound(0);

            await supabase.from('draft_rooms').update({ competition_state: initialState }).eq('id', roomId);
          }
        }
      }
      setLoading(false);
    };

    initArena();

    const roomChannel = supabase.channel(`room_${roomId}_arena_status`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'draft_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const state = payload.new.competition_state;
        if (state && state.currentRound >= currentRoundRef.current) {
          setTeams(state.teams || []);
          setMatches(state.matches || []);
          setCurrentRound(state.currentRound || 0);
          setScorersMap(state.scorersMap || {});
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  const generateMatchStats = (homeOvr: number, awayOvr: number, homeGoals: number, awayGoals: number) => {
    const seed = homeOvr + awayOvr + homeGoals * 10 + awayGoals * 5;
    const rng = (s: number) => {
      let x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    let homePossession = 50 + (homeOvr - awayOvr) * 0.5 + (homeGoals > awayGoals ? 5 : homeGoals < awayGoals ? -5 : 0);
    homePossession += (rng(seed) * 10 - 5);
    homePossession = Math.max(30, Math.min(70, Math.round(homePossession)));
    const awayPossession = 100 - homePossession;

    const homeShots = homeGoals + Math.floor(rng(seed + 1) * 8) + (homePossession > 50 ? 4 : 1);
    const awayShots = awayGoals + Math.floor(rng(seed + 2) * 8) + (awayPossession > 50 ? 4 : 1);

    const homeOnTarget = homeGoals + Math.floor(rng(seed + 3) * ((homeShots - homeGoals) || 1));
    const awayOnTarget = awayGoals + Math.floor(rng(seed + 4) * ((awayShots - awayGoals) || 1));

    const homeFouls = 5 + Math.floor(rng(seed + 5) * 12);
    const awayFouls = 5 + Math.floor(rng(seed + 6) * 12);

    return { homePossession, awayPossession, homeShots, awayShots, homeOnTarget, awayOnTarget, homeFouls, awayFouls };
  };

  const handleSimulateRoundHost = useCallback(async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const roundToSimulate = currentRound + 1;
    const newMatches = [...matches];
    const newTeams = teams.map(t => ({ ...t, stats: { ...t.stats } }));
    const newScorers = { ...scorersMap };

    let simulatedAny = false;

    newMatches.forEach((m, idx) => {
      if (m.round === roundToSimulate && !m.simulated) {
        simulatedAny = true;
        const home = newTeams.find(t => t.id === m.homeId)!;
        const away = newTeams.find(t => t.id === m.awayId)!;

        if (!home || !away) return;

        const result = simulateLeagueMatch(home, away);

        home.stats.gf += result.playerGoals;
        home.stats.ga += result.opponentGoals;
        home.stats.sg = home.stats.gf - home.stats.ga;

        away.stats.gf += result.opponentGoals;
        away.stats.ga += result.playerGoals;
        away.stats.sg = away.stats.gf - away.stats.ga;

        if (result.playerGoals > result.opponentGoals) {
          home.stats.pts += 3;
          home.stats.v += 1;
          away.stats.d += 1;
        } else if (result.playerGoals < result.opponentGoals) {
          away.stats.pts += 3;
          away.stats.v += 1;
          home.stats.d += 1;
        } else {
          home.stats.pts += 1;
          away.stats.pts += 1;
          home.stats.e += 1;
          away.stats.e += 1;
        }

        result.events.filter(e => e.type === 'goal').forEach(e => {
          const team = e.team === 'player' ? home : away;
          const key = `${e.scorerName}-${team.id}`;
          if (!newScorers[key]) {
            newScorers[key] = { playerName: e.scorerName!, teamId: team.id, teamName: team.name, goals: 1 };
          } else {
            newScorers[key].goals += 1;
          }
        });

        newMatches[idx] = {
          ...m,
          simulated: true,
          homeGoals: result.playerGoals,
          awayGoals: result.opponentGoals,
          homeScorers: result.events.filter(e => e.team === 'player' && e.type === 'goal').map(e => e.scorerName!),
          awayScorers: result.events.filter(e => e.team === 'opponent' && e.type === 'goal').map(e => e.scorerName!),
          events: result.events
        };
      }
    });

    if (!simulatedAny) {
      setIsSimulating(false);
      return;
    }

    const newState = {
      version: 1,
      currentRound: roundToSimulate,
      totalRounds: room?.competition_state?.totalRounds || 38,
      teams: newTeams,
      matches: newMatches,
      scorersMap: newScorers
    };

    setTeams(newTeams);
    setMatches(newMatches);
    setCurrentRound(roundToSimulate);
    setScorersMap(newScorers);

    await supabase.from('draft_rooms').update({ competition_state: newState }).eq('id', roomId);
    setIsSimulating(false);
  }, [currentRound, isSimulating, matches, room, roomId, scorersMap, teams]);

  // Auto Simulação via Host
  useEffect(() => {
    const isHost = players.find(p => p.id === localPlayerId)?.is_host;
    if (!isHost) return;

    const totalRounds = room?.competition_state?.totalRounds || 38;
    if (isAutoSimulating && currentRound < totalRounds && !isVisualSimulating && matchMinute === 90) {
      const timer = setTimeout(() => {
        handleSimulateRoundHost();
      }, simSpeed);
      return () => clearTimeout(timer);
    } else if (isAutoSimulating && currentRound >= totalRounds && !isVisualSimulating && matchMinute === 90) {
      setIsAutoSimulating(false);
    }
  }, [isAutoSimulating, currentRound, simSpeed, players, localPlayerId, room, handleSimulateRoundHost, isVisualSimulating, matchMinute]);

  const lastRoundMatches = useMemo(() => {
    return matches.filter(m => m.round === currentRound);
  }, [matches, currentRound]);

  // Enfileira rodadas recém-descobertas do Supabase
  useEffect(() => {
    if (currentRound > processedRound) {
      let startRound = processedRound + 1;
      
      // Se acabou de entrar na sala e ela já está na metade, ignora o passado pra não pipocar 10 jogos de uma vez
      if (processedRound === 0 && currentRound > 1) {
        startRound = currentRound;
      }
      
      const newQueue = [...liveMatchQueue];
      let lastProcessed = processedRound;

      for (let r = startRound; r <= currentRound; r++) {
        const roundMatches = matches.filter(m => m.round === r);
        const hasPvP = roundMatches.some(m => {
          const home = teams.find(t => t.id === m.homeId);
          const away = teams.find(t => t.id === m.awayId);
          const homeIsReal = players.some(p => p.id === home?.id);
          const awayIsReal = players.some(p => p.id === away?.id);
          return (home?.id === localPlayerId || away?.id === localPlayerId) && homeIsReal && awayIsReal;
        });

        if (hasPvP) {
          if (!newQueue.includes(r)) newQueue.push(r);
        }
        lastProcessed = r;
      }

      setLiveMatchQueue(newQueue);
      setProcessedRound(lastProcessed);
    }
  }, [currentRound, processedRound, matches, teams, players, localPlayerId, liveMatchQueue]);

  // Consome a fila de PvP
  useEffect(() => {
    if (!isVisualSimulating && liveMatchQueue.length > 0) {
      const nextRound = liveMatchQueue[0];
      setCurrentLiveRound(nextRound);
      setIsVisualSimulating(true);
      setMatchMinute(0);
      setLiveMatchQueue(prev => prev.slice(1));
    }
  }, [isVisualSimulating, liveMatchQueue]);

  // Timer do Jogo
  useEffect(() => {
    if (isVisualSimulating) {
      const interval = setInterval(() => {
        setMatchMinute(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            setIsVisualSimulating(false);
            setCurrentLiveRound(null);
            return 90;
          }
          return prev + 1;
        });
      }, 333); // ~30s reais = 90 minutos
      return () => clearInterval(interval);
    }
  }, [isVisualSimulating]);

  // Tela Final
  useEffect(() => {
    const totalRounds = room?.competition_state?.totalRounds || 38;
    if (totalRounds > 0 && currentRound === totalRounds && processedRound === totalRounds && liveMatchQueue.length === 0 && !isVisualSimulating && matchMinute === 90 && !showSummary) {
      setShowSummary(true);
    }
  }, [currentRound, processedRound, liveMatchQueue.length, isVisualSimulating, matchMinute, showSummary, room?.competition_state?.totalRounds]);

  if (loading || !room) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-white text-xl animate-pulse flex flex-col items-center gap-4">
          <Trophy className="w-12 h-12 text-amarelo-gol animate-bounce" />
          Preparando a Arena...
        </div>
      </div>
    );
  }

  const isHost = players.find(p => p.id === localPlayerId)?.is_host;
  const totalRounds = room.competition_state?.totalRounds || 38;
  const isFinal = room.format === 'final';
  
  const standings = getStandings(teams);
  const topScorers = getTopScorers(scorersMap);

  const formatScorers = (scorers: string[]) => {
    if (!scorers || scorers.length === 0) return '';
    const counts = scorers.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count]) => count > 1 ? `${name} (${count})` : name).join(', ');
  };

  const localPlayerInfo = players.find(p => p.id === localPlayerId);
  const nodes2D: FormationNode[][] = localPlayerInfo?.team_json || [];
  const teamOverall = localPlayerInfo?.overall || 0;
  const customTeamName = localPlayerInfo?.player_name || 'SEU TIME';

  const handleDownloadCard = async (type: 'story' | 'feed') => {
    if (!cardRef.current) return;

    setExportMode(type);
    
    // Aguarda o React renderizar o modo forçado (stack vertical ou horizontal)
    setTimeout(async () => {
      try {
        if (!cardRef.current) return;
        const canvas = await html2canvas(cardRef.current, { 
          backgroundColor: '#0a0f0a', 
          scale: 2,
          windowWidth: type === 'story' ? 390 : 1200 // Força tamanho da janela virtual
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `entrosa-multi-${type}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to save image', err);
      } finally {
        setExportMode(null);
      }
    }, 100);
  };

  const handleAbandon = () => {
    router.push('/draft/online');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f110f] font-sans text-white h-[100dvh] overflow-hidden">
      
      {/* HEADER: Top Simulation Bar */}
      <div className="flex flex-col bg-[#161a16] border-b border-white/10 shrink-0 z-20">
        {/* Title & Speed */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amarelo-gol" />
            <h2 className="font-display text-sm tracking-widest text-white/80">SIMULAÇÃO DE TEMPORADA</h2>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <div className="relative group">
                <button className="flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:text-white">
                  <Zap size={14} className={simSpeed === 1000 ? 'text-amarelo-gol' : ''} />
                  {simSpeed === 5000 ? 'Lento' : simSpeed === 3000 ? 'Médio' : simSpeed === 1000 ? 'Rápido' : 'Turbo'}
                </button>
                {/* Simple hover dropdown for speed */}
                <div className="absolute top-full right-0 mt-1 bg-black border border-white/10 rounded-lg p-1 hidden group-hover:flex flex-col gap-1 w-24">
                  <button onClick={() => setSimSpeed(5000)} className="text-xs font-bold px-2 py-1 text-left hover:bg-white/10 rounded">Lento</button>
                  <button onClick={() => setSimSpeed(3000)} className="text-xs font-bold px-2 py-1 text-left hover:bg-white/10 rounded">Médio</button>
                  <button onClick={() => setSimSpeed(1000)} className="text-xs font-bold px-2 py-1 text-left hover:bg-white/10 rounded">Rápido</button>
                  <button onClick={() => setSimSpeed(100)} className="text-xs font-bold px-2 py-1 text-left hover:bg-white/10 rounded text-amarelo-gol">Turbo</button>
                </div>
              </div>
            )}
            <button onClick={handleAbandon} className="p-1.5 text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Controls & Progress */}
        <div className="flex flex-col px-4 py-3 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {isHost ? (
                <>
                  <button 
                    disabled={currentRound >= totalRounds}
                    onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                    className={`flex items-center justify-center w-12 h-10 rounded-xl transition-all ${isAutoSimulating ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-amarelo-gol text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'} disabled:opacity-50 disabled:bg-zinc-800 disabled:text-white/50`}
                  >
                    {isAutoSimulating ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button 
                    disabled={isAutoSimulating || currentRound >= totalRounds}
                    onClick={handleSimulateRoundHost}
                    className="flex items-center gap-1 h-10 px-4 bg-white/10 text-white rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-white/20 transition-all border border-white/5"
                  >
                    <SkipForward size={16} /> +1
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center h-10 px-4 bg-white/5 text-white/50 rounded-xl font-bold text-xs uppercase tracking-wider">
                  <div className="w-2 h-2 bg-amarelo-gol rounded-full animate-pulse mr-2"></div>
                  Aguardando Host...
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono">Rodada {currentRound} / {totalRounds}</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-amarelo-gol transition-all duration-300" 
              style={{ width: `${(currentRound / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto relative pb-16">
        
        {/* TABELA TAB */}
        {activeTab === 'TABELA' && (
          <div className="p-4 flex flex-col gap-6">
            
            {/* Classificação */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <Trophy size={14} className="text-amarelo-gol" /> Tabela de Classificação
                </h3>
              </div>
              
              <div className="flex flex-col gap-3">
                {standings.slice(0, showFullTable ? standings.length : 5).map((team, idx) => {
                  const isMe = team.id === localPlayerId;
                  return (
                    <div key={team.id} className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40">
                      {/* Linha colorida lateral */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${idx === 0 ? 'bg-amarelo-gol' : idx < 4 ? 'bg-blue-500' : idx >= 16 ? 'bg-red-500' : 'bg-white/20'}`}></div>
                      
                      <div className="pl-4 pr-4 py-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-6 font-display text-xl text-white/50 text-right">{idx + 1}º</div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-display text-sm border border-white/5">
                                {team.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white uppercase text-sm leading-tight flex items-center gap-2">
                                  {team.name}
                                  {isMe && <span className="text-[8px] bg-amarelo-gol text-black px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">VOCÊ</span>}
                                  {team.id !== localPlayerId && (team as any).isRealPlayer && <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">JOGADOR</span>}
                                </span>
                                <span className="text-[10px] text-white/40 font-mono">'{String(team.year).slice(-2)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-2xl font-display text-amarelo-gol leading-none">{team.stats.pts}</span>
                            <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold">PTS</span>
                          </div>
                        </div>
                        
                        <div className="h-px w-full bg-white/5"></div>
                        
                        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-white/60">
                          <div className="flex gap-4">
                            <span>{currentRound}J</span>
                            <span>{team.stats.v}V</span>
                            <span>{team.stats.e}E</span>
                            <span>{team.stats.d}D</span>
                          </div>
                          <div className={`font-bold ${team.stats.sg > 0 ? 'text-verde-grama' : team.stats.sg < 0 ? 'text-red-400' : ''}`}>
                            {team.stats.sg > 0 ? `+${team.stats.sg}` : team.stats.sg}SG
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!showFullTable && standings.length > 5 ? (
                <button 
                  onClick={() => setShowFullTable(true)}
                  className="w-full mt-3 py-3 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <List size={14} /> Ver Tabela Completa
                </button>
              ) : showFullTable && standings.length > 5 ? (
                <button 
                  onClick={() => setShowFullTable(false)}
                  className="w-full mt-3 py-3 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronUp size={14} /> Recolher Tabela
                </button>
              ) : null}
            </div>

            {/* Artilharia */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-amarelo-gol" /> Artilharia
                </h3>
              </div>
              
              <div className="flex flex-col gap-2">
                {topScorers.slice(0, 5).map((s, idx) => (
                  <div key={`${s.playerName}-${s.teamId}`} className="flex items-center justify-between bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-mono text-white/40 w-4 text-right">{idx + 1}º</div>
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                        <User size={20} className="text-white/20" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="text-sm font-bold text-white uppercase leading-tight truncate max-w-[150px]">{s.playerName}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">{s.teamName}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-xl font-display text-verde-grama leading-none">{s.goals}</div>
                      <div className="text-[8px] text-white/30 font-bold uppercase tracking-widest">GOLS</div>
                    </div>
                  </div>
                ))}
                {topScorers.length === 0 && (
                  <div className="text-center py-8 text-white/20 text-xs italic bg-white/5 rounded-xl border border-white/5">Nenhum gol marcado ainda.</div>
                )}
              </div>
            </div>
            
          </div>
        )}

        {/* PARTIDAS TAB */}
        {activeTab === 'PARTIDAS' && (
          <div className="p-4 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Swords size={14} className="text-amarelo-gol" /> Rodada {currentRound}
            </h3>
            
            <div className="flex flex-col gap-4">
              {lastRoundMatches.map((m, idx) => {
                const home = teams.find(t => t.id === m.homeId)!;
                const away = teams.find(t => t.id === m.awayId)!;
                
                // Verifica se AMBOS são jogadores reais na sala (não são CPU) e se o usuário local está no meio
                const homeIsReal = players.some(p => p.id === home?.id);
                const awayIsReal = players.some(p => p.id === away?.id);
                const isPlayerMatch = (home?.id === localPlayerId || away?.id === localPlayerId) && homeIsReal && awayIsReal;
                const isLive = isVisualSimulating && currentLiveRound === m.round && isPlayerMatch;
                
                if (!home || !away) return null;

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
                  <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 bg-black/40 opacity-70 hover:opacity-100 transition-opacity ${isLive ? 'border-amarelo-gol shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-white/10'}`}>
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
                        <span className="text-xs font-bold uppercase truncate text-white/70">{home.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">'{String(home.year).slice(-2)}</span>
                      </div>
                      
                      <div className="px-4">
                        <div className={`bg-black/80 px-4 py-2 rounded-lg font-display text-xl flex items-center gap-3 border min-w-[90px] justify-center shadow-inner ${isLive ? 'border-amarelo-gol/50' : 'border-white/10'}`}>
                          <span className={displayHomeGoals! > displayAwayGoals! ? 'text-amarelo-gol' : 'text-white'}>{displayHomeGoals ?? '-'}</span>
                          <span className={`${isLive ? 'text-amarelo-gol/50 animate-pulse' : 'text-white/20'} text-sm`}>X</span>
                          <span className={displayAwayGoals! > displayHomeGoals! ? 'text-amarelo-gol' : 'text-white'}>{displayAwayGoals ?? '-'}</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-start">
                        <span className="text-xs font-bold uppercase truncate text-white/70">{away.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">'{String(away.year).slice(-2)}</span>
                      </div>
                    </div>
                    
                    {((displayHomeScorers?.length || 0) + (displayAwayScorers?.length || 0) > 0) && (
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
              {lastRoundMatches.length === 0 && (
                <div className="text-center py-10 text-white/20 text-xs italic">Nenhum jogo nesta rodada. O host precisa iniciar!</div>
              )}
            </div>
          </div>
        )}

        {/* ELENCO TAB */}
        {activeTab === 'ELENCO' && (
          <div className="flex flex-col h-[600px] overflow-hidden relative">
            <div className="p-4 flex items-center justify-between z-10 relative">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-amarelo-gol" /> Seu Elenco
              </h3>
            </div>
            
            <div className="flex-1 flex justify-center items-start pt-4 relative z-0 overflow-y-auto custom-scrollbar">
              <div className="transform scale-[0.85] origin-top pb-20">
                {nodes2D.length > 0 ? (
                  <Field 
                    nodes={nodes2D} 
                    onSlotClick={(id) => {
                      const node = nodes2D.flat().find(n => n.id === id);
                      if (node && node.playerName) {
                        setSelectedPlayer(node);
                      }
                    }} 
                  />
                ) : (
                  <div className="text-white/40 text-center italic mt-20">Elenco indisponível</div>
                )}
              </div>
            </div>

            {/* Player Details Modal/Panel */}
            <AnimatePresence>
              {selectedPlayer && (
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="absolute bottom-6 left-4 right-4 bg-gradient-to-t from-[#121612] to-[#1a201a] border border-amarelo-gol/30 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 flex items-center gap-4"
                >
                  <button 
                    onClick={() => setSelectedPlayer(null)}
                    className="absolute top-2 right-2 text-white/30 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                  
                  {selectedPlayer.faceUrl ? (
                    <img src={`/api/image?url=${encodeURIComponent(selectedPlayer.faceUrl)}`} alt="" className="w-16 h-16 object-contain drop-shadow-xl" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center font-bold text-2xl border-2 border-white/5">{selectedPlayer.playerName?.charAt(0)}</div>
                  )}
                  
                  <div className="flex flex-col flex-1">
                    <span className="text-[10px] font-mono text-amarelo-gol uppercase tracking-widest mb-1">{selectedPlayer.position}</span>
                    <span className="font-bold text-lg text-white uppercase leading-none mb-1">{selectedPlayer.playerName}</span>
                    <span className="text-xs text-white/50">{selectedPlayer.playerCountry || 'Brasil'}</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center bg-black/40 border border-white/5 p-3 rounded-xl min-w-[60px]">
                    <span className="text-2xl font-display text-amarelo-gol leading-none">{selectedPlayer.playerOvr}</span>
                    <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold mt-1">OVR</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* HISTORICO TAB */}
        {activeTab === 'HISTORICO' && (
          <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar h-[calc(100vh-200px)] pb-20">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <History size={14} className="text-amarelo-gol" /> Seu Histórico
            </h3>
            
            {(() => {
              const localTeam = teams.find(t => t.id === localPlayerId);
              const realPosition = getStandings(teams).findIndex(t => t.id === localPlayerId) + 1;
              const localScorers = Object.values(scorersMap).filter(s => s.teamId === localPlayerId).sort((a,b) => b.goals - a.goals);
              const localMatches = matches.filter(m => 
                m.homeGoals !== undefined && 
                (m.homeId === localPlayerId || m.awayId === localPlayerId) &&
                (!isVisualSimulating || m.round < currentRound)
              ).sort((a,b) => b.round - a.round);
              
              if (!localTeam) return <div className="text-white/40 italic text-sm text-center">Nenhuma estatística disponível ainda.</div>;
              
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Posição</div>
                      <div className="text-2xl font-display text-amarelo-gol">{realPosition}º</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Gols Marcados</div>
                      <div className="text-2xl font-display text-verde-grama">{localTeam.stats.gf}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Gols Sofridos</div>
                      <div className="text-2xl font-display text-red-500">{localTeam.stats.ga}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Saldo</div>
                      <div className="text-2xl font-display text-white">{localTeam.stats.sg > 0 ? `+${localTeam.stats.sg}` : localTeam.stats.sg}</div>
                    </div>
                  </div>

                  {localScorers.length > 0 && (
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Artilharia do Time</h4>
                      <div className="flex flex-col gap-2">
                        {localScorers.slice(0,5).map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white/[0.02] p-2 rounded">
                            <span className="text-sm font-bold text-white truncate">{s.playerName}</span>
                            <span className="text-amarelo-gol font-display">{s.goals} <span className="text-[10px] text-white/40">GOLS</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Partidas Disputadas ({localMatches.length})</h4>
                    {localMatches.map(m => {
                      const isHome = m.homeId === localPlayerId;
                      const opponentId = isHome ? m.awayId : m.homeId;
                      const opponentTeam = teams.find(t => t.id === opponentId);
                      const myGoals = isHome ? m.homeGoals : m.awayGoals;
                      const oppGoals = isHome ? m.awayGoals : m.homeGoals;
                      const isWin = myGoals! > oppGoals!;
                      const isDraw = myGoals === oppGoals;
                      
                      return (
                        <div key={m.round} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                          <div className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Rodada {m.round}</div>
                          <div className="flex items-center justify-between">
                            <div className={`flex-1 truncate ${isHome ? 'font-bold text-white' : 'text-white/60'}`}>{localTeam.name}</div>
                            <div className="px-3 flex items-center gap-2">
                              <span className={isHome ? 'text-amarelo-gol font-bold' : ''}>{m.homeGoals}</span>
                              <span className="text-white/20">×</span>
                              <span className={!isHome ? 'text-amarelo-gol font-bold' : ''}>{m.awayGoals}</span>
                            </div>
                            <div className={`flex-1 truncate text-right ${!isHome ? 'font-bold text-white' : 'text-white/60'}`}>{opponentTeam?.name || 'Adversário'}</div>
                          </div>
                          <div className="mt-2 text-[10px] flex gap-2">
                            <span className={`px-2 py-0.5 rounded font-bold ${isWin ? 'bg-verde-grama/20 text-verde-grama' : isDraw ? 'bg-white/10 text-white/50' : 'bg-red-500/20 text-red-400'}`}>
                              {isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {localMatches.length === 0 && (
                      <div className="text-center py-6 text-white/30 text-xs italic">Ainda não disputou jogos.</div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'CONFIG' && (
          <div className="p-4 flex flex-col gap-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Settings size={14} className="text-amarelo-gol" /> Configurações
            </h3>
            
            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-1">Interface</h4>
              
              <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden flex flex-col">
                <button className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5">
                  <span className="text-sm font-bold">Modo Escuro</span>
                  <div className="w-8 h-4 bg-amarelo-gol rounded-full relative">
                    <div className="w-4 h-4 bg-black rounded-full absolute right-0 shadow-sm border border-amarelo-gol"></div>
                  </div>
                </button>
                <button className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left opacity-50">
                  <span className="text-sm font-bold">Animações de Partida</span>
                  <div className="w-8 h-4 bg-white/20 rounded-full relative">
                    <div className="w-4 h-4 bg-white/50 rounded-full absolute left-0 shadow-sm"></div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-1">Sessão</h4>
              
              <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden flex flex-col">
                <button onClick={handleAbandon} className="flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-left text-red-400">
                  <span className="text-sm font-bold">Sair da Sala</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="bg-[#121412] border-t border-white/10 shrink-0 pb-safe">
        <div className="flex items-center justify-between px-2 sm:px-6 py-2">
          
          <button onClick={() => setActiveTab('TABELA')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'TABELA' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Trophy size={20} className={activeTab === 'TABELA' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Tabela</span>
          </button>
          
          <button onClick={() => setActiveTab('PARTIDAS')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'PARTIDAS' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Swords size={20} className={activeTab === 'PARTIDAS' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Partidas</span>
          </button>

          <button onClick={() => setActiveTab('ELENCO')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'ELENCO' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Users size={20} className={activeTab === 'ELENCO' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Elenco</span>
          </button>

          <button onClick={() => setActiveTab('HISTORICO')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'HISTORICO' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <History size={20} className={activeTab === 'HISTORICO' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Histórico</span>
          </button>

          <button onClick={() => setActiveTab('CONFIG')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'CONFIG' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Settings size={20} className={activeTab === 'CONFIG' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Config.</span>
          </button>

        </div>
      </div>

      {/* END OF SEASON SUMMARY MODAL OVERLAY (WIDESCREEN DASHBOARD) */}
      <AnimatePresence>
        {(currentRound === totalRounds && totalRounds > 0 && showSummary) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-start p-4 sm:p-8 py-12 overflow-y-auto custom-scrollbar"
          >
            <div className="w-full max-w-6xl relative flex flex-col items-center mt-8">
              <button onClick={() => setShowSummary(false)} className="fixed top-4 right-4 sm:top-8 sm:right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[100] shadow-lg backdrop-blur-sm cursor-pointer">
                <X size={24} />
              </button>
              
              {/* Card Exportável Widescreen */}
              <div 
                ref={cardRef}
                id="share-card-widescreen"
                className="w-full bg-[#0a0f0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col"
              >
                {/* Background Decor */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#121612] via-[#0a0f0a] to-[#0a0f0a] pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none"><Trophy size={400} /></div>
                
                {/* 1. HEADER (Temporada Encerrada) */}
                <div className="relative z-10 p-6 sm:p-10 flex flex-col items-center text-center border-b border-white/5">
                  <div className="text-amarelo-gol font-mono text-[10px] font-bold tracking-[0.3em] uppercase mb-2">FIM DE TEMPORADA • {isFinal ? 'FINAL' : 'BRASILEIRÃO'} MULTIPLAYER</div>
                  <h2 className="text-3xl sm:text-4xl font-display text-white mb-2">Temporada Encerrada!</h2>
                  <p className="text-xs sm:text-sm text-white/50 mb-6">Sala {room.short_code} • {players.length} jogadores • {totalRounds} rodadas</p>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-amarelo-gol/10 border border-amarelo-gol/30 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                      <Trophy size={16} className="text-amarelo-gol" />
                      <span className="text-xs sm:text-sm font-bold text-amarelo-gol uppercase">Campeão: {standings[0]?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-verde-grama/10 border border-verde-grama/30 rounded-full">
                      <Zap size={16} className="text-verde-grama" />
                      <span className="text-xs sm:text-sm font-bold text-verde-grama">
                        {teams.reduce((acc, t) => acc + t.stats.gf, 0)} gols marcados
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CLASSIFICAÇÃO FINAL (Top 4 Row) */}
                <div className="relative z-10 p-6 sm:p-10 border-b border-white/5">
                  <h3 className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-6">Classificação Final</h3>
                  
                  <div className={`flex flex-wrap gap-6 ${exportMode === 'story' ? 'flex-col items-center' : 'justify-center items-stretch'}`}>
                    {standings.filter(team => players.some(p => p.id === team.id)).slice(0, 4).map((team, idx) => {
                      const realPosition = standings.findIndex(t => t.id === team.id) + 1;
                      const isChampion = realPosition === 1;
                      // Fetch team_json from players to get players list (only for Real Players)
                      const playerDoc = players.find(p => p.id === team.id);
                      const tName = playerDoc?.team_name || 'Sem Nome';
                      let topPlayers: FormationNode[] = [];
                      if (playerDoc && playerDoc.team_json) {
                        topPlayers = playerDoc.team_json.flat().filter((n: any) => n.playerName).sort((a: any, b: any) => (b.playerOvr || 0) - (a.playerOvr || 0));
                      }
                      
                      return (
                        <div key={team.id} className={`flex flex-col bg-[#121612] rounded-2xl border ${isChampion ? 'border-amarelo-gol shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-white/10'} p-5 sm:p-6 relative overflow-hidden transition-all w-full max-w-[280px] flex-1`}>
                          {isChampion && <div className="absolute top-0 left-0 w-full h-1.5 bg-amarelo-gol"></div>}
                          
                          {/* Header do Card (Player info) */}
                          <div className="flex items-center gap-3 mb-6">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display text-lg shadow-inner ${isChampion ? 'bg-amarelo-gol text-black' : 'bg-white/10 text-white/50 border border-white/5'}`}>
                              {realPosition}º
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-bold text-white uppercase truncate flex items-center gap-1.5 text-base">
                                {team.name} {isChampion && <span className="text-amarelo-gol text-sm">👑</span>}
                              </span>
                              <span className="text-[10px] text-white/40 truncate uppercase tracking-widest">{tName}</span>
                            </div>
                          </div>
                          
                          {/* V E D Stats */}
                          <div className="flex justify-between mb-5">
                            <div className="flex flex-col items-center">
                              <span className="text-xl font-display text-verde-grama">{team.stats.v}</span>
                              <span className="text-[8px] sm:text-[9px] text-white/30 uppercase tracking-widest">Vitórias</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-xl font-display text-white/60">{team.stats.e}</span>
                              <span className="text-[8px] sm:text-[9px] text-white/30 uppercase tracking-widest">Empates</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-xl font-display text-red-400">{team.stats.d}</span>
                              <span className="text-[8px] sm:text-[9px] text-white/30 uppercase tracking-widest">Derrotas</span>
                            </div>
                          </div>
                          
                          {/* PTS / GOLS / SALDO */}
                          <div className="flex justify-between mb-6 pb-6 border-b border-white/5">
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-display text-amarelo-gol">{team.stats.pts}</span>
                              <span className="text-[9px] text-white/30 uppercase tracking-widest">Pts</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-display text-white">{team.stats.gf}</span>
                              <span className="text-[9px] text-white/30 uppercase tracking-widest">Gols</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className={`text-3xl font-display ${team.stats.sg > 0 ? 'text-verde-grama' : team.stats.sg < 0 ? 'text-red-400' : 'text-white'}`}>
                                {team.stats.sg > 0 ? `+${team.stats.sg}` : team.stats.sg}
                              </span>
                              <span className="text-[9px] text-white/30 uppercase tracking-widest">Saldo</span>
                            </div>
                          </div>
                          
                          {/* OVR Bar */}
                          <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-[9px] text-white/40 uppercase tracking-widest">OVR Médio</span>
                              <span className="font-display text-xl leading-none">{team.ovr || (playerDoc?.overall || 0)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full ${isChampion ? 'bg-amarelo-gol' : idx === 1 ? 'bg-blue-400' : idx === 2 ? 'bg-orange-500' : 'bg-white/30'}`} style={{ width: `${Math.min(100, ((team.ovr || playerDoc?.overall || 0) / 99) * 100)}%` }}></div>
                            </div>
                          </div>
                          
                          {/* Elenco Preview */}
                          <div className="flex flex-col gap-2.5">
                            <span className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Elenco</span>
                            {topPlayers.slice(0, 5).map((p, i) => (
                              <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-[9px] text-white/30 font-mono w-6">{p.position}</span>
                                  <span className="text-xs text-white/70 group-hover:text-white transition-colors font-bold truncate">{p.playerName}</span>
                                </div>
                                <span className="text-xs font-display text-verde-grama">{p.playerOvr}</span>
                              </div>
                            ))}
                            {topPlayers.length === 0 && (
                              <div className="text-[10px] text-white/30 italic">Time Controlado pela CPU</div>
                            )}
                            {topPlayers.length > 5 && (
                              <span className="text-[9px] text-white/30 mt-2 italic">+ {topPlayers.length - 5} jogadores...</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. PRÊMIOS INDIVIDUAIS */}
                <div className="relative z-10 p-6 sm:p-10 bg-black/20">
                  <h3 className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-6">Prêmios Individuais</h3>
                  
                  <div className={`grid gap-6 ${exportMode === 'story' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
                    {/* Artilheiro */}
                    <div className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                      <div className="w-14 h-14 bg-amarelo-gol/20 rounded-2xl flex items-center justify-center border border-amarelo-gol/30 shrink-0">
                        <Trophy size={24} className="text-amarelo-gol" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Artilheiro</span>
                        <span className="font-bold text-white uppercase text-base truncate">{topScorers[0]?.playerName || '—'}</span>
                        <span className="text-xs text-white/50 truncate font-mono mt-0.5">{topScorers[0]?.goals || 0} gols • {topScorers[0]?.teamName || '—'}</span>
                      </div>
                    </div>
                    
                    {/* Menos Vazado */}
                    {(() => {
                      const bestDef = [...standings].sort((a, b) => a.stats.ga - b.stats.ga)[0];
                      const bdName = players.find(p => p.id === bestDef?.id)?.team_name || bestDef?.name;
                      return (
                        <div className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                          <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shrink-0">
                            <Swords size={24} className="text-blue-400" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Defesa Sólida</span>
                            <span className="font-bold text-white uppercase text-base truncate">{bdName || '—'}</span>
                            <span className="text-xs text-white/50 truncate font-mono mt-0.5">{bestDef?.stats.ga || 0} gols sofridos</span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Craque da Sala */}
                    {(() => {
                      let bestPlayer: any = null;
                      let bestOvr = 0;
                      let bestOwner = '';
                      
                      players.forEach(p => {
                        if (p.team_json) {
                          p.team_json.flat().forEach((n: any) => {
                            if (n.playerOvr && n.playerOvr > bestOvr) {
                              bestOvr = n.playerOvr;
                              bestPlayer = n.playerName;
                              bestOwner = p.player_name;
                            }
                          });
                        }
                      });

                      return (
                        <div className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                          <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30 shrink-0">
                            <Zap size={24} className="text-purple-400" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Craque da Sala</span>
                            <span className="font-bold text-white uppercase text-base truncate">{bestPlayer || '—'}</span>
                            <span className="text-xs text-white/50 truncate font-mono mt-0.5">OVR {bestOvr} • {bestOwner}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>

              {/* Botões abaixo do card */}
              <div className="flex flex-col sm:flex-row gap-4 w-full mt-6 justify-center max-w-[600px]">
                <button 
                  onClick={() => handleDownloadCard('story')}
                  className="flex-1 py-4 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-[0_5px_15px_rgba(219,39,119,0.3)] text-[11px] uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Instagram Story
                </button>
                <button 
                  onClick={() => handleDownloadCard('feed')}
                  className="flex-1 py-4 bg-[#25D366] text-black font-bold rounded-xl hover:bg-[#1fb355] transition-all shadow-[0_5px_15px_rgba(37,211,102,0.3)] text-[11px] uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Download size={16} /> WhatsApp / PC
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
