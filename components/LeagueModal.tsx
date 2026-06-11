import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Trophy, FastForward, List, Pause, SkipForward, User, CheckCircle2, Download } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 font-sans">
      <div className="bg-[#0f110f] border border-white/10 rounded-xl max-w-6xl w-full h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden relative text-white">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-3 border-b border-white/10 bg-[#161a16] gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-amarelo-gol text-black p-2 rounded-lg">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="font-display text-xl leading-none">BRASILEIRÃO</h2>
              <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase mt-1">Simulação de Temporada</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setSimSpeed(5000)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${simSpeed === 5000 ? 'bg-white/10 text-white' : 'text-white/40'}`}
              >LENTO</button>
              <button 
                onClick={() => setSimSpeed(3000)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${simSpeed === 3000 ? 'bg-white/10 text-white' : 'text-white/40'}`}
              >MÉDIO</button>
              <button 
                onClick={() => setSimSpeed(1000)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${simSpeed === 1000 ? 'bg-white/10 text-white' : 'text-white/40'}`}
              >RÁPIDO</button>
            </div>

            <div className="flex items-center gap-2">
              {currentRound < totalRounds ? (
                <>
                  <button 
                    onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${isAutoSimulating ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-verde-grama text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'}`}
                  >
                    {isAutoSimulating ? <><Pause size={16} /> <span className="hidden sm:inline">PAUSAR</span></> : <><FastForward size={16} /> <span className="hidden sm:inline">SIMULAR</span> TUDO</>}
                  </button>
                  <button 
                    disabled={isAutoSimulating}
                    onClick={simulateRound}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white text-black rounded-lg font-bold text-xs sm:text-sm disabled:opacity-50 transition-all hover:bg-zinc-200"
                  >
                    <SkipForward size={16} /> +1
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowSummary(true)}
                    className="bg-zinc-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-700 transition-all border border-white/10"
                  >
                    VER RESUMO
                  </button>
                  <button 
                    onClick={onClose}
                    className="bg-amarelo-gol text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                  >
                    <CheckCircle2 size={18} /> FINALIZAR TEMPORADA
                  </button>
                </div>
              )}
            </div>

            <button onClick={onClose} className="text-white/40 hover:text-white p-2 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          <AnimatePresence>
            {(currentRound === totalRounds && showSummary) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
              >
                <div className="w-full max-w-4xl">
                  {/* Card exportável */}
                  <div 
                    ref={cardRef}
                    className="border border-amarelo-gol/50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.15)] bg-[#0a0f0a]"
                  >
                    <div className="flex flex-col md:flex-row">
                      
                      {/* Lado Esquerdo - Stats */}
                      <div className="w-full md:w-[300px] shrink-0 flex flex-col justify-between bg-gradient-to-b from-[#0a0f0a] to-[#111] border-b md:border-b-0 md:border-r border-amarelo-gol/20 p-6 md:p-8 text-center md:text-left">
                        
                        <div>
                          <div className="mb-6 flex flex-col items-center md:items-start gap-2">
                            <img src="/logo.png" alt="ENTROSA" className="w-32 md:w-24 h-auto drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
                            <div className="text-amarelo-gol/60 font-mono text-xs font-bold tracking-[0.3em] uppercase">BRASILEIRÃO</div>
                          </div>
                          
                          {(() => {
                            const pos = standings.findIndex(t => t.id === 'player') + 1;
                            const isChampion = pos === 1;
                            return (
                              <>
                                <div className={`text-4xl font-display mb-1 tracking-wide ${isChampion ? 'text-amarelo-gol drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : pos <= 4 ? 'text-blue-400' : pos >= 17 ? 'text-vermelho-erro' : 'text-white'}`}>
                                  {isChampion ? 'CAMPEÃO!' : `${pos}º LUGAR`}
                                </div>
                                <div className="text-xs text-white/40 font-bold tracking-[0.2em] uppercase mb-8">
                                  {isChampion ? 'A GLÓRIA ETERNA' : pos <= 4 ? 'CLASSIFICADO PRA LIBERTADORES' : pos >= 17 ? 'REBAIXADO' : 'TEMPORADA ENCERRADA'}
                                </div>
                              </>
                            );
                          })()}

                          <div className="space-y-4">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Overall</span>
                              <span className="text-3xl font-display text-amarelo-gol">{teamOverall}</span>
                            </div>
                            <div className="h-px bg-white/10"></div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Pontos</span>
                              <span className="text-3xl font-display text-white">{teams.find(t => t.id === 'player')?.stats.pts}</span>
                            </div>
                            <div className="h-px bg-white/10"></div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-white/40 font-bold tracking-widest uppercase">V-E-D</span>
                              <span className="text-xl font-display text-white/80">{teams.find(t => t.id === 'player')?.stats.v}-{teams.find(t => t.id === 'player')?.stats.e}-{teams.find(t => t.id === 'player')?.stats.d}</span>
                            </div>
                            <div className="h-px bg-white/10"></div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Gols Pró</span>
                              <span className="text-3xl font-display text-verde-grama">{teams.find(t => t.id === 'player')?.stats.gf}</span>
                            </div>
                            <div className="h-px bg-white/10"></div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-white/40 font-bold tracking-widest uppercase">Sofridos</span>
                              <span className="text-3xl font-display text-red-400">{teams.find(t => t.id === 'player')?.stats.ga}</span>
                            </div>
                            {myTopScorer && (
                              <>
                                <div className="h-px bg-white/10"></div>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-xs text-white/40 font-bold tracking-widest uppercase truncate max-w-[120px]">⚽ {myTopScorer.playerName}</span>
                                  <span className="text-3xl font-display text-verde-grama">{myTopScorer.goals}</span>
                                </div>
                              </>
                            )}
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
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        
                        {/* Watermark */}
                        <div className="absolute bottom-3 right-4 opacity-40 pointer-events-none flex flex-col items-end gap-1">
                          <img src="/logo.png" alt="ENTROSA" className="h-5 w-auto grayscale" />
                          <span className="font-mono text-[8px] text-white tracking-widest font-bold">entrosa.app</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Botões abaixo do card */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center items-center">
                    <button 
                      onClick={handleDownloadCard}
                      className="px-8 py-3 bg-amarelo-gol text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center gap-3"
                    >
                      <Download size={20} />
                      SALVAR IMAGEM
                    </button>
                    <button 
                      onClick={() => setShowSummary(false)}
                      className="px-8 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2"
                    >
                      VER TABELA E ESTATÍSTICAS
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          
          {/* Standings Column */}
          <div className="flex-[3] p-4 overflow-y-auto border-r border-white/5 bg-black/20">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <List size={14} className="text-amarelo-gol" /> Tabela de Classificação
              </h3>
              <div className="text-[10px] font-mono text-white/20">RODADA {currentRound}/{totalRounds}</div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex text-[10px] font-mono text-white/30 px-3 uppercase pb-2 border-b border-white/5">
                <div className="w-8">Pos</div>
                <div className="flex-1">Clube</div>
                <div className="w-10 text-center text-white">P</div>
                <div className="w-8 text-center">J</div>
                <div className="w-8 text-center">V</div>
                <div className="w-8 text-center">E</div>
                <div className="w-8 text-center">D</div>
                <div className="w-10 text-center">SG</div>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                {standings.map((team, idx) => (
                  <motion.div 
                    layout
                    key={team.id}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`flex items-center text-xs px-3 py-2 rounded-lg border transition-all ${team.id === 'player' ? 'bg-amarelo-gol/10 border-amarelo-gol/30 shadow-[inset_0_0_15px_rgba(234,179,8,0.05)]' : 'bg-white/[0.02] border-white/5'} ${idx < 4 ? 'border-l-4 border-l-blue-500' : idx >= 16 ? 'border-l-4 border-l-red-500' : ''}`}
                  >
                    <div className="w-8 font-mono text-white/40">{idx + 1}</div>
                    <div className="flex-1 flex items-center gap-2 truncate">
                      <span className="font-bold text-white uppercase truncate">{team.name}</span>
                      <span className="text-[9px] text-white/20 font-mono">'{String(team.year).slice(-2)}</span>
                      {team.id === 'player' && <span className="text-[8px] bg-amarelo-gol text-black px-1 rounded font-bold uppercase">Você</span>}
                    </div>
                    <div className="w-10 text-center font-display text-base text-amarelo-gol">{team.stats.pts}</div>
                    <div className="w-8 text-center font-mono text-white/40">{currentRound}</div>
                    <div className="w-8 text-center font-mono text-white/40">{team.stats.v}</div>
                    <div className="w-8 text-center font-mono text-white/40">{team.stats.e}</div>
                    <div className="w-8 text-center font-mono text-white/40">{team.stats.d}</div>
                    <div className="w-10 text-center font-mono font-bold text-white/80">{team.stats.sg > 0 ? `+${team.stats.sg}` : team.stats.sg}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Scorers & Last Results */}
          <div className="flex-[2] flex flex-col overflow-hidden bg-black/40">
            
            {/* Top Scorers */}
            <div className="flex-1 p-4 overflow-y-auto border-b border-white/5">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={14} className="text-amarelo-gol" /> Artilharia
              </h3>
              
              <div className="flex flex-col gap-2">
                {topScorers.length > 0 ? topScorers.map((s, idx) => (
                  <div key={`${s.playerName}-${s.teamId}`} className="flex items-center justify-between bg-white/[0.03] p-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-mono text-white/20 w-4">{idx + 1}</div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase">{s.playerName}</div>
                        <div className="text-[9px] text-white/30 uppercase tracking-tighter">{s.teamName}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-lg font-display text-verde-grama leading-none">{s.goals}</div>
                      <div className="text-[8px] text-white/20 font-bold uppercase">GOLS</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 text-white/20 text-xs italic">Nenhum gol marcado ainda.</div>
                )}
              </div>
            </div>

            {/* Last Round Matches */}
            <div className="flex-1 p-4 overflow-y-auto bg-black/40">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                Resultados da Rodada {currentRound}
              </h3>
              
              <div className="flex flex-col gap-2">
                {lastRoundMatches.map((m, idx) => {
                  const home = teams.find(t => t.id === m.homeId)!;
                  const away = teams.find(t => t.id === m.awayId)!;
                  return (
                    <div key={idx} className={`p-3 rounded-lg border flex flex-col gap-1 transition-all ${m.homeId === 'player' || m.awayId === 'player' ? 'bg-amarelo-gol/5 border-amarelo-gol/20' : 'bg-white/[0.02] border-white/5'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-right text-xs font-bold truncate pr-2 uppercase">
                          {home.name} <span className="text-[9px] text-white/30 ml-1">'{String(home.year).slice(-2)}</span>
                        </div>
                        <div className="bg-black/60 px-3 py-1 rounded font-display text-lg flex gap-2 border border-white/10 min-w-[70px] justify-center">
                          <span className={m.homeGoals! > m.awayGoals! ? 'text-amarelo-gol' : 'text-white'}>{m.homeGoals}</span>
                          <span className="text-white/20">-</span>
                          <span className={m.awayGoals! > m.homeGoals! ? 'text-amarelo-gol' : 'text-white'}>{m.awayGoals}</span>
                        </div>
                        <div className="flex-1 text-left text-xs font-bold truncate pl-2 uppercase">
                          <span className="text-[9px] text-white/30 mr-1">'{String(away.year).slice(-2)}</span> {away.name}
                        </div>
                      </div>
                      {(m.homeScorers?.length || 0) + (m.awayScorers?.length || 0) > 0 && (
                        <div className="flex justify-between text-[8px] text-white/40 italic px-1 mt-1">
                          <div className="flex-1 text-right truncate" title={formatScorers(m.homeScorers || [])}>{formatScorers(m.homeScorers || [])}</div>
                          <div className="w-16"></div>
                          <div className="flex-1 text-left truncate" title={formatScorers(m.awayScorers || [])}>{formatScorers(m.awayScorers || [])}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
