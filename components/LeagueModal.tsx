import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Trophy, FastForward, List, Pause, SkipForward, User, CheckCircle2, Download, Swords, Users, Home, Settings, ChevronDown, ChevronUp, Zap } from 'lucide-react';
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
import { FormationNode } from '@/components/Field';
import { supabase } from '@/lib/supabase';
import html2canvas from 'html2canvas';

interface LeagueModalProps {
  onClose: () => void;
  nodes2D: FormationNode[][];
  teamOverall: number;
}

export function LeagueModal({ onClose, nodes2D, teamOverall }: LeagueModalProps) {
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1000);
  const [scorersMap, setScorersMap] = useState<Record<string, LeagueScorer>>({});
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(true);

  const cardRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'TABELA' | 'PARTIDAS' | 'ELENCO' | 'ESTADIO' | 'CONFIG'>('TABELA');
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);

  // Inicialização
  useEffect(() => {
    async function initLeague() {
      try {
        const res = await fetch('/api/league/teams?count=19');
        const data = await res.json();

        const players = nodes2D.flat().filter(n => n.playerName);
        const playerTeam: LeagueTeam = {
          id: 'player',
          name: 'Seu Time',
          year: 2024,
          ovr: teamOverall,
          playerNames: players.map(n => n.playerName!),
          positionCodes: players.map(n => n.position),
          stats: { pts: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 }
        };

        const opponentTeams: LeagueTeam[] = data.map((t: any, i: number) => ({
          id: `cpu-${i}`,
          name: t.name,
          year: t.year,
          ovr: t.ovr,
          playerNames: t.playerNames,
          positionCodes: t.positionCodes,
          stats: { pts: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 }
        }));

        const allTeams = [playerTeam, ...opponentTeams];
        const allMatches = generateRoundRobin(allTeams);

        setTeams(allTeams);
        setMatches(allMatches);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao inicializar liga:', err);
      }
    }
    initLeague();
  }, [nodes2D, teamOverall]);

  const totalRounds = teams.length > 0 ? (teams.length - 1) * 2 : 38;

  const simulateRound = useCallback(() => {
    setCurrentRound(prevRound => {
      const roundToSimulate = prevRound + 1;
      if (roundToSimulate > totalRounds) {
        setIsAutoSimulating(false);
        return prevRound;
      }

      setMatches(prevMatches => {
        // Prevenção robusta: se qualquer jogo desta rodada já estiver simulado, não faz nada
        if (prevMatches.some(m => m.round === roundToSimulate && m.simulated)) {
          return prevMatches;
        }

        const newMatches = [...prevMatches];
        
        setTeams(prevTeams => {
          // Clone profundo dos times para evitar mutação direta no estado
          const newTeams = prevTeams.map(t => ({
            ...t,
            stats: { ...t.stats }
          }));

          setScorersMap(prevScorers => {
            const newScorers = { ...prevScorers };

            // Processar cada jogo da rodada
            newMatches.forEach((m, idx) => {
              if (m.round === roundToSimulate && !m.simulated) {
                const home = newTeams.find(t => t.id === m.homeId)!;
                const away = newTeams.find(t => t.id === m.awayId)!;

                const result = simulateLeagueMatch(home, away);

                // Atualizar estatísticas nos objetos clonados
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

                // Atualizar artilheiros
                result.events.filter(e => e.type === 'goal').forEach(e => {
                  const team = e.team === 'player' ? home : away;
                  const key = `${e.scorerName}-${team.id}`;
                  if (!newScorers[key]) {
                    newScorers[key] = {
                      playerName: e.scorerName!,
                      teamId: team.id,
                      teamName: team.name,
                      goals: 1
                    };
                  } else {
                    newScorers[key].goals += 1;
                  }
                });

                // Atualizar o jogo no novo array (sem mutação)
                newMatches[idx] = {
                  ...m,
                  simulated: true,
                  homeGoals: result.playerGoals,
                  awayGoals: result.opponentGoals,
                  homeScorers: result.events.filter(e => e.team === 'player' && e.type === 'goal').map(e => e.scorerName!),
                  awayScorers: result.events.filter(e => e.team === 'opponent' && e.type === 'goal').map(e => e.scorerName!)
                };
              }
            });

            return newScorers;
          });

          if (roundToSimulate === totalRounds) {
            setIsAutoSimulating(false);
            saveLeagueStats(newTeams);
          }
          return newTeams;
        });

        return newMatches;
      });

      return roundToSimulate;
    });
  }, [totalRounds]);

  const saveLeagueStats = async (finalTeams: LeagueTeam[]) => {
    const playerTeam = finalTeams.find(t => t.id === 'player');
    if (!playerTeam) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) return;

      const userId = session.user.id;
      // Aqui você pode adicionar lógica para salvar conquistas da liga no Supabase se desejar
      // Por enquanto vamos apenas registrar que ele jogou
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profile) {
        await supabase.from('profiles').update({
          draft_total_matches: (profile.draft_total_matches || 0) + 1,
          draft_total_goals: (profile.draft_total_goals || 0) + playerTeam.stats.gf,
          draft_goals_conceded: (profile.draft_goals_conceded || 0) + playerTeam.stats.ga
        }).eq('id', userId);
      }
    } catch (e) {
      console.error('Erro ao salvar stats da liga:', e);
    }
  };

  useEffect(() => {
    if (isAutoSimulating && currentRound < totalRounds) {
      const timeout = setTimeout(() => {
        simulateRound();
      }, simSpeed);
      return () => clearTimeout(timeout);
    }
  }, [isAutoSimulating, simulateRound, simSpeed, currentRound, totalRounds]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-white text-xl animate-pulse flex flex-col items-center gap-4">
          <Trophy className="w-12 h-12 text-amarelo-gol animate-bounce" />
          Organizando Calendário da Liga...
        </div>
      </div>
    );
  }

  const standings = getStandings(teams);
  const topScorers = getTopScorers(scorersMap);
  const lastRoundMatches = matches.filter(m => m.round === currentRound);

  const myTeamScorers = Object.values(scorersMap).filter(s => s.teamId === 'player').sort((a, b) => b.goals - a.goals);
  const myTopScorer = myTeamScorers.length > 0 ? myTeamScorers[0] : null;

  const topScorerTeam = myTopScorer ? teams.find(t => t.id === myTopScorer.teamId) : null;

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#0a0a0a', scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `entrosa-brasileirao-${teamOverall}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image', err);
    }
  };

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
      
      {/* HEADER: Top Simulation Bar */}
      <div className="flex flex-col bg-[#161a16] border-b border-white/10 shrink-0 z-20">
        {/* Title & Speed */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amarelo-gol" />
            <h2 className="font-display text-sm tracking-widest text-white/80">SIMULAÇÃO DE TEMPORADA</h2>
          </div>
          <div className="flex items-center gap-2">
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
            <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Controls & Progress */}
        <div className="flex flex-col px-4 py-3 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button 
                disabled={currentRound >= totalRounds}
                onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                className={`flex items-center justify-center w-12 h-10 rounded-xl transition-all ${isAutoSimulating ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-amarelo-gol text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'} disabled:opacity-50 disabled:bg-zinc-800 disabled:text-white/50`}
              >
                {isAutoSimulating ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button 
                disabled={isAutoSimulating || currentRound >= totalRounds}
                onClick={simulateRound}
                className="flex items-center gap-1 h-10 px-4 bg-white/10 text-white rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-white/20 transition-all border border-white/5"
              >
                <SkipForward size={16} /> +1
              </button>
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
                {standings.slice(0, showFullTable ? standings.length : 5).map((team, idx) => (
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
                                {team.id === 'player' && <span className="text-[8px] bg-amarelo-gol text-black px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">VOCÊ</span>}
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
                ))}
              </div>

              {!showFullTable && standings.length > 5 && (
                <button 
                  onClick={() => setShowFullTable(true)}
                  className="w-full mt-3 py-3 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <List size={14} /> Ver Tabela Completa
                </button>
              )}
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
            
            <div className="flex flex-col gap-3">
              {lastRoundMatches.map((m, idx) => {
                const home = teams.find(t => t.id === m.homeId)!;
                const away = teams.find(t => t.id === m.awayId)!;
                const isPlayerMatch = m.homeId === 'player' || m.awayId === 'player';
                
                return (
                  <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 ${isPlayerMatch ? 'bg-amarelo-gol/10 border-amarelo-gol/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-black/40 border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex flex-col items-end">
                        <span className="text-xs font-bold uppercase truncate">{home.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">'{String(home.year).slice(-2)}</span>
                      </div>
                      
                      <div className="px-4">
                        <div className="bg-black/80 px-4 py-2 rounded-lg font-display text-xl flex items-center gap-3 border border-white/10 min-w-[90px] justify-center shadow-inner">
                          <span className={m.homeGoals! > m.awayGoals! ? 'text-amarelo-gol' : 'text-white'}>{m.homeGoals ?? '-'}</span>
                          <span className="text-white/20 text-sm">X</span>
                          <span className={m.awayGoals! > m.homeGoals! ? 'text-amarelo-gol' : 'text-white'}>{m.awayGoals ?? '-'}</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-start">
                        <span className="text-xs font-bold uppercase truncate">{away.name}</span>
                        <span className="text-[9px] text-white/40 font-mono">'{String(away.year).slice(-2)}</span>
                      </div>
                    </div>
                    
                    {((m.homeScorers?.length || 0) + (m.awayScorers?.length || 0) > 0) && (
                      <>
                        <div className="h-px bg-white/5 w-full"></div>
                        <div className="flex justify-between text-[9px] text-white/50 uppercase tracking-wider px-2">
                          <div className="flex-1 text-right truncate text-verde-grama/80">{formatScorers(m.homeScorers || [])}</div>
                          <div className="w-16"></div>
                          <div className="flex-1 text-left truncate text-verde-grama/80">{formatScorers(m.awayScorers || [])}</div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {lastRoundMatches.length === 0 && (
                <div className="text-center py-10 text-white/20 text-xs italic">Nenhum jogo nesta rodada.</div>
              )}
            </div>
          </div>
        )}

        {/* ELENCO TAB */}
        {activeTab === 'ELENCO' && (
          <div className="p-4 flex flex-col gap-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-amarelo-gol" /> Seu Elenco
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {nodes2D.flat().filter(n => n.playerName).sort((a,b) => (b.playerOvr||0) - (a.playerOvr||0)).map((player, idx) => (
                <div key={idx} className="bg-gradient-to-br from-[#1a1f1a] to-[#0a0f0a] border border-white/10 rounded-xl p-3 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Users size={40} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-white/60">{player.position}</span>
                    <span className="font-display text-lg text-amarelo-gol leading-none">{player.playerOvr}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-auto relative z-10">
                    {player.faceUrl ? (
                      <img src={`/api/image?url=${encodeURIComponent(player.faceUrl)}`} alt="" className="w-8 h-8 object-contain drop-shadow-md" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">{player.playerName?.charAt(0)}</div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white uppercase truncate w-[80px]">{player.playerName}</span>
                      <span className="text-[9px] text-white/40 font-mono uppercase">{player.playerCountry?.slice(0,3) || 'BRA'}</span>
                    </div>
                  </div>
                  
                  <button className="mt-3 w-full py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/50 hover:bg-white/10 transition-colors uppercase tracking-widest">
                    Escalar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ESTADIO TAB */}
        {activeTab === 'ESTADIO' && (
          <div className="p-4 flex flex-col gap-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Home size={14} className="text-amarelo-gol" /> Instalações do Clube
            </h3>
            
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>
              <Home size={40} className="text-white/20 mx-auto mb-4" />
              <h4 className="text-2xl font-display text-white mb-1">Arena Entrosa</h4>
              <p className="text-xs text-white/40 font-mono tracking-widest uppercase mb-6">Estádio Principal</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Capacidade</div>
                  <div className="text-xl font-display text-white">45.000</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Receita / Jogo</div>
                  <div className="text-xl font-display text-verde-grama">R$ 2.4M</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">Melhorias (Em Breve)</h4>
              
              {['Arquibancada Nível 2', 'Iluminação LED', 'Gramado Sintético', 'Centro Médico'].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5 opacity-50 cursor-not-allowed">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{item}</span>
                    <span className="text-[9px] text-white/40 uppercase">Bloqueado</span>
                  </div>
                  <button disabled className="px-3 py-1.5 bg-white/5 rounded border border-white/10 text-[10px] font-bold text-white/30 uppercase">
                    Comprar
                  </button>
                </div>
              ))}
            </div>
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
              <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-1">Temporada</h4>
              
              <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden flex flex-col">
                <button className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 text-amarelo-gol">
                  <span className="text-sm font-bold">Salvar Progresso</span>
                </button>
                <button onClick={onClose} className="flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-left text-red-400">
                  <span className="text-sm font-bold">Abandonar Temporada</span>
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

          <button onClick={() => setActiveTab('ESTADIO')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'ESTADIO' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Home size={20} className={activeTab === 'ESTADIO' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Estádio</span>
          </button>

          <button onClick={() => setActiveTab('CONFIG')} className={`flex flex-col items-center gap-1 p-2 flex-1 rounded-lg transition-colors ${activeTab === 'CONFIG' ? 'text-amarelo-gol' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>
            <Settings size={20} className={activeTab === 'CONFIG' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : ''} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Config.</span>
          </button>

        </div>
      </div>

      {/* END OF SEASON SUMMARY MODAL OVERLAY */}
      <AnimatePresence>
        {(currentRound === totalRounds && showSummary) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-4xl relative">
              <button onClick={() => setShowSummary(false)} className="absolute -top-12 right-0 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
              
              {/* Card exportável */}
              <div 
                ref={cardRef}
                className="border border-amarelo-gol/50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.15)] bg-[#0a0f0a]"
              >
                <div className="flex flex-col md:flex-row">
                  
                  {/* Lado Esquerdo - Stats */}
                  <div className="w-full md:w-[300px] shrink-0 flex flex-col justify-between bg-gradient-to-b from-[#0a0f0a] to-[#111] border-b md:border-b-0 md:border-r border-amarelo-gol/20 p-6 md:p-8 text-center md:text-left">
                    
                    <div>
                      <div className="mb-6 flex flex-col items-center md:items-start gap-2">
                        <img src="/logo.png" alt="ENTROSA" className="w-24 h-auto drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
                        <div className="text-amarelo-gol/60 font-mono text-[10px] font-bold tracking-[0.3em] uppercase">BRASILEIRÃO</div>
                      </div>
                      
                      {(() => {
                        const pos = standings.findIndex(t => t.id === 'player') + 1;
                        const isChampion = pos === 1;
                        return (
                          <>
                            <div className={`text-4xl font-display mb-1 tracking-wide ${isChampion ? 'text-amarelo-gol drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : pos <= 4 ? 'text-blue-400' : pos >= 17 ? 'text-vermelho-erro' : 'text-white'}`}>
                              {isChampion ? 'CAMPEÃO!' : `${pos}º LUGAR`}
                            </div>
                            <div className="text-[10px] text-white/40 font-bold tracking-[0.2em] uppercase mb-8">
                              {isChampion ? 'A GLÓRIA ETERNA' : pos <= 4 ? 'CLASSIFICADO PRA LIBERTADORES' : pos >= 17 ? 'REBAIXADO' : 'TEMPORADA ENCERRADA'}
                            </div>
                          </>
                        );
                      })()}

                      <div className="space-y-4">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Overall</span>
                          <span className="text-3xl font-display text-amarelo-gol">{teamOverall}</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Pontos</span>
                          <span className="text-3xl font-display text-white">{teams.find(t => t.id === 'player')?.stats.pts}</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">V-E-D</span>
                          <span className="text-xl font-display text-white/80">{teams.find(t => t.id === 'player')?.stats.v}-{teams.find(t => t.id === 'player')?.stats.e}-{teams.find(t => t.id === 'player')?.stats.d}</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Gols Pró</span>
                          <span className="text-3xl font-display text-verde-grama">{teams.find(t => t.id === 'player')?.stats.gf}</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Sofridos</span>
                          <span className="text-3xl font-display text-red-400">{teams.find(t => t.id === 'player')?.stats.ga}</span>
                        </div>
                        {myTopScorer && (
                          <>
                            <div className="h-px bg-white/10"></div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase truncate max-w-[120px]">⚽ {myTopScorer.playerName}</span>
                              <span className="text-3xl font-display text-verde-grama">{myTopScorer.goals}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-8">
                      <span className="text-[10px] text-white/30 font-mono tracking-widest">entrosa.app</span>
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
                                <span className="absolute -top-1.5 -right-1.5 z-20 bg-amarelo-gol text-black text-[9px] font-mono font-bold px-1 py-0.5 rounded shadow-md">{node.playerOvr}</span>
                              )}
                              <span className="text-[8px] font-mono text-white/50 uppercase tracking-wider mb-0.5 z-10 absolute top-0.5 left-1">{node.position}</span>
                              
                              {node.faceUrl ? (
                                <img src={`/api/image?url=${encodeURIComponent(node.faceUrl)}`} alt={node.playerName} className="w-10 h-10 object-contain mt-1 drop-shadow-md z-10" />
                              ) : (
                                <div className="w-8 h-8 mt-1 rounded-full bg-verde-grama flex items-center justify-center text-white font-display text-sm border border-amarelo-gol/50 z-10">
                                  {node.playerName?.charAt(0) || '—'}
                                </div>
                              )}
                              
                              <span className="text-[10px] mt-1 font-display text-white uppercase leading-tight truncate w-full max-w-[65px] text-center font-bold z-20">{node.playerName || '—'}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    
                    <div className="absolute bottom-3 right-4 opacity-40 pointer-events-none flex flex-col items-end gap-1">
                      <img src="/logo.png" alt="ENTROSA" className="h-4 w-auto grayscale" />
                      <span className="font-mono text-[8px] text-white tracking-widest font-bold">entrosa.app</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Botões abaixo do card */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center items-center">
                <button 
                  onClick={handleDownloadCard}
                  className="w-full sm:w-auto px-8 py-3.5 bg-amarelo-gol text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center justify-center gap-3"
                >
                  <Download size={20} />
                  SALVAR IMAGEM
                </button>
                <button 
                  onClick={() => setShowSummary(false)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  FECHAR E VER TABELA
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
