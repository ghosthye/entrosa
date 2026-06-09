import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Clock, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Field } from '@/components/Field';
import { simulateMatch } from '@/lib/simulation';

interface DuelMatchSimulationProps {
  duel: any;
  isCreator: boolean;
  onSimulationComplete: () => void;
  buildNodes2D: (chain: any[], formation: string) => any[][];
}

export function DuelMatchSimulation({ duel, isCreator, onSimulationComplete, buildNodes2D }: DuelMatchSimulationProps) {
  const [minute, setMinute] = useState(0);
  const [matchEnded, setMatchEnded] = useState(false);
  const [score, setScore] = useState({ creator: 0, challenger: 0 });
  const [matchLog, setMatchLog] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const creatorNodes = buildNodes2D(duel.creator_team, duel.settings.formation);
  const challengerNodes = buildNodes2D(duel.challenger_team, duel.settings.formation);
  
  const creatorAvg = Math.floor(duel.creator_team.reduce((acc: any, node: any) => acc + (node.player.overall || 70), 0) / duel.creator_team.length);
  const challengerAvg = Math.floor(duel.challenger_team.reduce((acc: any, node: any) => acc + (node.player.overall || 70), 0) / duel.challenger_team.length);
  const creatorOvr = creatorAvg + Math.floor(duel.creator_score / 100);
  const challengerOvr = challengerAvg + Math.floor(duel.challenger_score / 100);

  // Fallback for old duels that didn't have matchData saved
  const matchData = useMemo(() => {
    if (duel.settings.matchData) return duel.settings.matchData;
    const creatorNames = duel.creator_team.map((n: any) => n.player.name);
    const challengerNames = duel.challenger_team.map((n: any) => n.player.name);
    return simulateMatch(creatorOvr, challengerOvr, creatorNames, challengerNames);
  }, [duel.settings.matchData, creatorOvr, challengerOvr, duel.creator_team, duel.challenger_team]);

  // Sync logic
  const matchStartTime = useMemo(() => {
    return duel.settings.matchStartTime || (Date.now() + 1000); // Fallback para duelos que bugaram sem o matchStartTime
  }, [duel.settings.matchStartTime]);
  
  const REAL_MS_PER_GAME_MIN = 150; // 13.5 seconds total match time

  useEffect(() => {
    if (!matchStartTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now < matchStartTime) {
        setMinute(0);
        return;
      }
      
      const elapsedMs = now - matchStartTime;
      const gameMin = Math.floor(elapsedMs / REAL_MS_PER_GAME_MIN);
      
      if (gameMin >= 90) {
        setMinute(90);
        setMatchEnded(true);
        clearInterval(interval);
      } else {
        setMinute(gameMin);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [matchStartTime]);

  useEffect(() => {
    if (!matchData || !matchData.events) return;
    
    // Filter events up to current minute
    const visibleEvents = matchData.events.filter((e: any) => e.minute <= minute);
    
    // Compute score based on visible events
    const goalsCreator = visibleEvents.filter((e: any) => e.type === 'goal' && e.team === 'player').length;
    const goalsChallenger = visibleEvents.filter((e: any) => e.type === 'goal' && e.team === 'opponent').length;
    
    setScore({ creator: goalsCreator, challenger: goalsChallenger });
    
    // Compute logs
    const logs = visibleEvents.map((e: any) => {
      const teamName = e.team === 'player' ? duel.creator_name : duel.challenger_name;
      return `${e.minute}' - [${teamName.toUpperCase()}] ${e.description}`;
    }).reverse();
    
    const fullLogs = [...logs];
    if (minute > 0) fullLogs.push('Apita o árbitro! Começa o grande Duelo!');
    if (matchEnded) fullLogs.unshift('Fim de Jogo!');
    
    setMatchLog(fullLogs.slice(0, 5));
  }, [minute, matchData, matchEnded, duel.creator_name, duel.challenger_name]);

  const renderMiniField = (nodes: any[][]) => (
    <div className="w-full bg-[#124d29] relative p-6 sm:p-8 flex flex-col justify-center min-h-[500px]">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-4 border-2 border-white rounded-lg"></div>
        <div className="absolute top-1/2 left-4 right-4 h-px bg-white"></div>
        <div className="absolute w-24 h-24 border-2 border-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      <div className="relative z-10 flex flex-col gap-3 sm:gap-4 h-full justify-between">
        {nodes.map((row, ri) => (
          <div key={ri} className="flex flex-row justify-center gap-2 sm:gap-4">
            {row.map((node: any, ci: number) => (
              <div key={`${ri}-${ci}`} className="relative flex flex-col items-center bg-[#0d3d1f] border border-[#1D9E75]/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 min-w-[65px] sm:min-w-[85px] shadow-lg">
                {node.playerOvr && (
                  <span className="absolute -top-2 -right-2 z-20 bg-amarelo-gol text-black text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded shadow-md">{node.playerOvr}</span>
                )}
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-1 z-10 absolute top-1 left-1.5">{node.position}</span>
                
                {node.faceUrl ? (
                  <img src={`/api/image?url=${encodeURIComponent(node.faceUrl)}`} alt={node.playerName} className="w-10 h-10 sm:w-14 sm:h-14 object-contain mt-3 sm:mt-4 drop-shadow-md z-10" />
                ) : (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 mt-3 sm:mt-4 rounded-full bg-verde-grama flex items-center justify-center text-white font-display text-sm sm:text-base border border-amarelo-gol/50 z-10">
                    {node.playerName?.charAt(0) || '—'}
                  </div>
                )}
                
                <span className="text-[10px] sm:text-[13px] mt-2 font-display text-white uppercase leading-tight truncate w-full max-w-[70px] sm:max-w-[90px] text-center font-bold z-20">{node.playerName || '—'}</span>
                {node.playerCountry && (
                  <span className="mt-0.5 text-[8px] sm:text-[10px] font-bold text-white/70 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-sm uppercase tracking-wide z-20">{node.playerCountry.substring(0,3)}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 opacity-40 pointer-events-none flex flex-col items-end gap-1">
        <span className="font-mono text-[10px] sm:text-xs text-white tracking-widest font-bold">entrosa.app</span>
      </div>
    </div>
  );

  if (matchEnded) {
    const isCreatorWinner = matchData.penalties 
      ? matchData.penalties.winner === 'player'
      : score.creator > score.challenger;
      
    const isChallengerWinner = matchData.penalties 
      ? matchData.penalties.winner === 'opponent'
      : score.challenger > score.creator;

    const handleDownloadCard = async () => {
      if (!cardRef.current) return;
      try {
        const canvas = await html2canvas(cardRef.current, { backgroundColor: '#0a0f0a', scale: 2 });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `duelo-entrosa-${duel.creator_name}-vs-${duel.challenger_name}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to save image', err);
      }
    };

    return (
      <div className="flex flex-col items-center w-full">
        <div className="text-center mb-4 animate-fade-in">
           <h2 className="text-4xl font-display text-amarelo-gol uppercase tracking-wider mb-1">APITO FINAL!</h2>
           <p className="text-lg text-[var(--text-secondary)]">Que partida espetacular!</p>
        </div>
        
        {/* BIG SHAREABLE CARD */}
        <div 
          ref={cardRef}
          className="w-full max-w-[1200px] bg-[#0a0f0a] border-4 border-amarelo-gol/30 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.15)] flex flex-col relative mx-auto"
        >
           <div className="flex flex-col lg:flex-row w-full relative">
              
              {/* CREATOR TEAM COLUMN */}
              <div className={`flex flex-col flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border-color)]/30 relative ${isCreatorWinner ? 'bg-amarelo-gol/5' : ''}`}>
                 {/* Creator Header */}
                 <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center relative bg-[var(--bg-background)] border-b border-amarelo-gol/30">
                   {isCreatorWinner && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amarelo-gol text-black px-6 py-1.5 rounded-full font-bold uppercase text-sm flex items-center gap-2 shadow-md z-10 whitespace-nowrap">
                        <Trophy size={16} /> Vencedor
                      </div>
                   )}
                   <h3 className="text-3xl font-bold text-[var(--text-primary)] uppercase mt-6 mb-1 truncate max-w-[250px] sm:max-w-full">{duel.creator_name}</h3>
                   <p className="text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-4">Mandante</p>
                   <div className="text-7xl font-mono font-bold text-[var(--text-primary)] mb-1 drop-shadow-md">{score.creator}</div>
                   <p className="text-xs text-cinza-borda font-bold uppercase tracking-wider mb-2">GOLS</p>
                   
                   {matchData.penalties && (
                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] w-full flex flex-col items-center gap-2">
                        <div className="text-sm font-bold text-[var(--text-secondary)] uppercase">Pênaltis</div>
                        <div className="text-3xl font-mono font-bold text-amarelo-gol">{matchData.penalties.playerScore}</div>
                        <div className="flex gap-1 mt-1">
                          {matchData.penalties.playerHistory.map((goal: boolean, i: number) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${goal ? 'bg-verde-grama' : 'bg-vermelho-erro'}`} />
                          ))}
                        </div>
                      </div>
                   )}
                 </div>
                 {/* Creator Field */}
                 <div className="flex-1 bg-[#124d29]">
                    {renderMiniField(creatorNodes)}
                 </div>
              </div>

              {/* VS BADGE centered for Desktop */}
              <div className="hidden lg:flex absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0f0a] border-4 border-[var(--border-color)] w-20 h-20 rounded-full items-center justify-center font-display text-3xl text-[var(--text-primary)] shadow-[0_0_30px_rgba(0,0,0,0.8)] z-30 text-red-500">
                VS
              </div>
              
              {/* VS BADGE for Mobile (Between the two columns) */}
              <div className="flex lg:hidden items-center justify-center py-4 bg-[var(--bg-background)] border-y border-[var(--border-color)] self-stretch w-full shadow-lg z-20">
                <div className="bg-[#0a0f0a] border-4 border-[var(--border-color)] w-14 h-14 rounded-full flex items-center justify-center font-display text-xl text-[var(--text-primary)] shadow-[0_0_20px_rgba(0,0,0,0.5)] text-red-500">VS</div>
              </div>

              {/* CHALLENGER TEAM COLUMN */}
              <div className={`flex flex-col flex-1 relative ${isChallengerWinner ? 'bg-amarelo-gol/5' : ''}`}>
                 {/* Challenger Header */}
                 <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center relative bg-[var(--bg-background)] border-b border-amarelo-gol/30">
                   {isChallengerWinner && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amarelo-gol text-black px-6 py-1.5 rounded-full font-bold uppercase text-sm flex items-center gap-2 shadow-md z-10 whitespace-nowrap">
                        <Trophy size={16} /> Vencedor
                      </div>
                   )}
                   <h3 className="text-3xl font-bold text-[var(--text-primary)] uppercase mt-6 mb-1 truncate max-w-[250px] sm:max-w-full">{duel.challenger_name}</h3>
                   <p className="text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-4">Desafiante</p>
                   <div className="text-7xl font-mono font-bold text-[var(--text-primary)] mb-1 drop-shadow-md">{score.challenger}</div>
                   <p className="text-xs text-cinza-borda font-bold uppercase tracking-wider mb-2">GOLS</p>
                   
                   {matchData.penalties && (
                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] w-full flex flex-col items-center gap-2">
                        <div className="text-sm font-bold text-[var(--text-secondary)] uppercase">Pênaltis</div>
                        <div className="text-3xl font-mono font-bold text-amarelo-gol">{matchData.penalties.opponentScore}</div>
                        <div className="flex gap-1 mt-1">
                          {matchData.penalties.opponentHistory.map((goal: boolean, i: number) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${goal ? 'bg-verde-grama' : 'bg-vermelho-erro'}`} />
                          ))}
                        </div>
                      </div>
                   )}
                 </div>
                 {/* Challenger Field */}
                 <div className="flex-1 bg-[#124d29]">
                    {renderMiniField(challengerNodes)}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full max-w-lg">
          <button 
            onClick={handleDownloadCard}
            className="w-full sm:flex-1 bg-amarelo-gol hover:bg-yellow-400 text-black font-bold py-4 rounded-xl uppercase tracking-wider transition-transform active:scale-95 shadow-[0_10px_20px_rgba(234,179,8,0.3)] flex items-center justify-center gap-2"
          >
            <Download size={22} /> Salvar
          </button>
          
          <button 
            onClick={onSimulationComplete}
            className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl uppercase tracking-wider transition-transform active:scale-95 shadow-[0_10px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
          >
            Lobby
          </button>
        </div>
      </div>
    );
  }

  const isWaitingToStart = matchStartTime && Date.now() < matchStartTime;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
      <div className="flex-[2] p-6 sm:p-10 flex flex-col overflow-y-auto border-b md:border-b-0 md:border-r border-[var(--border-color)]">
        <div className="text-center mb-8">
          <div className="text-blue-500 font-display text-2xl tracking-wide uppercase flex items-center justify-center gap-2">
            <Trophy size={24} /> O GRANDE DUELO
          </div>
        </div>

        <div className="w-full flex flex-row justify-between items-center mb-10 gap-4">
          <div className="text-center flex-1 min-w-0">
            <div className="text-sm text-[var(--text-secondary)] font-bold mb-1 tracking-wider uppercase">Mandante</div>
            <div className="text-2xl sm:text-4xl font-display text-[var(--text-primary)] truncate">{duel.creator_name}</div>
            <div className="text-xs sm:text-sm font-mono mt-2 text-verde-grama bg-verde-grama/10 inline-block px-3 py-1 rounded-full border border-verde-grama/20">OVR Real {creatorOvr}</div>
          </div>
          
          <div className="flex flex-col items-center shrink-0">
            <div className="text-4xl sm:text-6xl font-display text-[var(--text-primary)] px-4 sm:px-6 bg-[var(--bg-background)] rounded-xl border border-[var(--border-color)] py-3 shadow-inner">
              {score.creator} - {score.challenger}
            </div>
          </div>

          <div className="text-center flex-1 min-w-0">
            <div className="text-sm text-[var(--text-secondary)] font-bold mb-1 tracking-wider uppercase">Desafiante</div>
            <div className="text-2xl sm:text-4xl font-display text-[var(--text-primary)] truncate">{duel.challenger_name}</div>
            <div className="text-xs sm:text-sm font-mono mt-2 text-vermelho-erro bg-vermelho-erro/10 inline-block px-3 py-1 rounded-full border border-vermelho-erro/20">OVR Real {challengerOvr}</div>
          </div>
        </div>

        <div className="text-center mt-auto">
          <div className="text-8xl font-mono mb-12 text-[var(--text-secondary)] drop-shadow-md">
            {minute}'
          </div>
          
          {isWaitingToStart && (
             <div className="flex items-center justify-center gap-2 text-amarelo-gol font-bold text-xl animate-pulse">
                <Clock size={24} /> PREPARE-SE! O JOGO VAI COMEÇAR!
             </div>
          )}
        </div>
      </div>

      {/* Match Logs Sidebar */}
      <div className="flex-1 md:w-96 bg-[var(--bg-background)] p-6 flex flex-col">
        <h3 className="font-bold text-[var(--text-secondary)] mb-6 uppercase text-sm border-b border-[var(--border-color)] pb-3 tracking-widest flex items-center gap-2">
           Lances da Partida
        </h3>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
          {matchLog.map((log, i) => (
            <div key={i} className={`p-4 rounded-xl text-sm font-medium leading-relaxed animate-fade-in-right ${log.includes('GOL!') ? 'bg-amarelo-gol text-black shadow-[0_0_15px_rgba(234,179,8,0.2)]' : log.includes('para fora') ? 'bg-vermelho-erro/20 text-red-500 border border-vermelho-erro/30' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>
              {log}
            </div>
          ))}
          {matchLog.length === 0 && (
            <div className="text-center text-[var(--text-secondary)] text-sm mt-10">
               {isWaitingToStart ? 'As equipes estão em campo...' : 'Aguardando o início do jogo...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
