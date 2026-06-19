import React, { useRef, useEffect } from 'react';
import { Trophy, Clock } from 'lucide-react';

interface MatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
}

interface MatchResult {
  playerGoals: number;
  opponentGoals: number;
  events: any[];
  stats?: {
    player: MatchStats;
    opponent: MatchStats;
  };
}

export interface LiveMatchOverlayProps {
  match: any; // LeagueMatch
  minute: number;
  homeTeam: any; // LeagueTeam
  awayTeam: any; // LeagueTeam
  onClose?: () => void;
}

function StatBar({ label, homeVal, awayVal, isPercentage = false }: { label: string, homeVal: number, awayVal: number, isPercentage?: boolean }) {
  const total = Math.max(homeVal + awayVal, 1);
  const homePct = (homeVal / total) * 100;
  const awayPct = (awayVal / total) * 100;

  return (
    <div className="flex flex-col gap-1 mb-4 w-full">
      <div className="flex justify-between text-xs font-bold text-white uppercase tracking-wider mb-1">
        <span>{isPercentage ? `${Math.round(homeVal)}%` : Math.round(homeVal)}</span>
        <span className="text-white/40">{label}</span>
        <span>{isPercentage ? `${Math.round(awayVal)}%` : Math.round(awayVal)}</span>
      </div>
      <div className="flex h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div className="bg-blue-500 transition-all duration-300" style={{ width: `${homePct}%` }}></div>
        <div className="bg-red-500 transition-all duration-300" style={{ width: `${awayPct}%` }}></div>
      </div>
    </div>
  );
}

export function LiveMatchOverlay({ match, minute, homeTeam, awayTeam, onClose }: LiveMatchOverlayProps) {
  const visibleEvents = match.events?.filter((e: any) => e.minute <= minute) || [];
  
  const homeGoals = visibleEvents.filter((e: any) => e.type === 'goal' && e.team === 'player').length;
  const awayGoals = visibleEvents.filter((e: any) => e.type === 'goal' && e.team === 'opponent').length;

  const progress = Math.min(minute / 90, 1);
  
  const finalHomeStats = match.stats?.player || { possession: 50, shots: 0, shotsOnTarget: 0 };
  const finalAwayStats = match.stats?.opponent || { possession: 50, shots: 0, shotsOnTarget: 0 };

  const baseTrend = 50 + (finalHomeStats.possession - 50) * Math.pow(progress, 0.5);
  const fluctuation = Math.sin(minute * 0.8) * 4 + Math.cos(minute * 1.5) * 2;
  
  let momentum = 0;
  const upcomingEvent = match.events?.find((e: any) => e.minute >= minute && e.minute <= minute + 3);
  const recentEvent = match.events?.find((e: any) => e.minute < minute && e.minute >= minute - 2);

  if (recentEvent) {
    momentum = recentEvent.team === 'player' ? 8 : -8;
  } else if (upcomingEvent) {
    momentum = upcomingEvent.team === 'player' ? 4 : -4;
  }

  let currentHomePossession = baseTrend + fluctuation + momentum;
  currentHomePossession = Math.max(20, Math.min(80, currentHomePossession));
  const currentAwayPossession = 100 - currentHomePossession;

  // Calcula posição alvo da bola X e Y
  let targetBallX = 50;
  let targetBallY = 50;

  if (upcomingEvent) {
    // Bola progredindo para o ataque!
    const attackProgress = 1 - ((upcomingEvent.minute - minute) / 3);
    const isHome = upcomingEvent.team === 'player';
    
    // De onde a bola partiu (meio campo ou um pouco recuada)
    const startX = isHome ? 40 : 60;
    // Onde a bola vai parar no clímax do lance
    const endX = isHome ? (upcomingEvent.type === 'goal' ? 98 : 88) : (upcomingEvent.type === 'goal' ? 2 : 12);
    targetBallX = startX + (endX - startX) * Math.pow(attackProgress, 0.8);

    // Interpola Y (Começa pela lateral, cruza pro meio)
    const sideY = (upcomingEvent.minute % 2 === 0) ? 15 : 85; 
    const endY = upcomingEvent.type === 'goal' ? 50 : (upcomingEvent.minute % 3 === 0 ? 30 : 70);
    targetBallY = sideY + (endY - sideY) * attackProgress;

  } else if (recentEvent) {
    // Mantém a bola no local final do lance por alguns minutos (alguns segundos reais) 
    // Isso dá tempo da animação CSS chegar até o destino e o usuário ver a bola no gol!
    const isHome = recentEvent.team === 'player';
    targetBallX = isHome ? (recentEvent.type === 'goal' ? 98 : 88) : (recentEvent.type === 'goal' ? 2 : 12);
    targetBallY = recentEvent.type === 'goal' ? 50 : (recentEvent.minute % 3 === 0 ? 30 : 70);
  } else {
    // Fica variando no meio campo (Tiki-taka) pendendo pra quem tem mais posse
    const possessionOffset = (currentHomePossession - 50) * 0.4;
    targetBallX = 50 + possessionOffset + Math.sin(minute * 1.5) * 15;
    targetBallY = 50 + Math.cos(minute * 1.2) * 35;
  }

  // Clamp pra não sair do campo
  targetBallX = Math.max(2, Math.min(98, targetBallX));
  targetBallY = Math.max(5, Math.min(95, targetBallY));

  const currentHomeShots = Math.max(homeGoals, Math.floor(finalHomeStats.shots * progress));
  const currentAwayShots = Math.max(awayGoals, Math.floor(finalAwayStats.shots * progress));
  
  const currentHomeShotsOnTarget = Math.max(homeGoals, Math.floor(finalHomeStats.shotsOnTarget * progress));
  const currentAwayShotsOnTarget = Math.max(awayGoals, Math.floor(finalAwayStats.shotsOnTarget * progress));

  const logs = visibleEvents.map((e: any) => {
    const teamName = e.team === 'player' ? homeTeam.name : awayTeam.name;
    return {
      text: `${e.minute}' - [${teamName.toUpperCase()}] ${e.description}`,
      team: e.team,
      type: e.type,
      isGoal: e.type === 'goal'
    };
  }).reverse();
  
  const fullLogs = [...logs];
  if (minute > 0) fullLogs.push({ text: 'Apita o árbitro! Começa a partida!', team: 'neutral', type: 'info', isGoal: false });
  if (minute >= 90) fullLogs.unshift({ text: 'Fim de Jogo!', team: 'neutral', type: 'info', isGoal: false });

  return (
    <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-start p-4 overflow-hidden animate-fade-in backdrop-blur-sm">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/50 hover:text-white transition-colors z-50"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}

      <div className="w-full max-w-2xl bg-gradient-to-b from-[#1a1e1a] to-[#121512] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative mb-6 shrink-0 mt-8">
        <div className="absolute top-4 flex flex-col items-center">
          <span className="text-amarelo-gol font-bold animate-pulse text-xs tracking-widest uppercase">AO VIVO</span>
          <span className="text-4xl font-display text-white mt-1 drop-shadow-md">{minute}'</span>
        </div>
        
        <div className="flex w-full justify-between items-center mt-12 gap-4">
          <div className="flex-1 flex flex-col items-center text-center">
            <span className="text-xs text-white/50 uppercase tracking-widest mb-1 font-bold">Mandante</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-400 uppercase leading-tight">{homeTeam.name}</span>
            <span className="text-[10px] text-white/40 font-mono mt-1">OVR {homeTeam.ovr}</span>
          </div>
          
          <div className="flex items-center justify-center shrink-0">
            <div className="text-5xl sm:text-6xl font-display text-white px-6 bg-black rounded-xl border border-white/10 py-2 shadow-inner">
              {homeGoals} - {awayGoals}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center text-center">
            <span className="text-xs text-white/50 uppercase tracking-widest mb-1 font-bold">Visitante</span>
            <span className="text-xl sm:text-2xl font-bold text-red-400 uppercase leading-tight">{awayTeam.name}</span>
            <span className="text-[10px] text-white/40 font-mono mt-1">OVR {awayTeam.ovr}</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <div className="flex-1 bg-[#161a16] border border-white/10 rounded-2xl p-6 flex flex-col items-center shadow-lg overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-6">
            Estatísticas da Partida
          </h3>
          
          <StatBar label="Posse de Bola" homeVal={currentHomePossession} awayVal={currentAwayPossession} isPercentage={true} />
          <StatBar label="Finalizações" homeVal={currentHomeShots} awayVal={currentAwayShots} />
          <StatBar label="Chutes no Alvo" homeVal={currentHomeShotsOnTarget} awayVal={currentAwayShotsOnTarget} />
          
          {/* Mini Campinho */}
          <div className="mt-auto w-full pt-4">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2 flex justify-between">
              <span>Defesa {homeTeam.name}</span>
              <span>Posição da Bola</span>
              <span>Defesa {awayTeam.name}</span>
            </div>
            
            <div className="relative w-full h-24 bg-green-900/40 border-2 border-white/20 rounded-lg overflow-hidden flex shadow-inner">
               {/* Linhas do campo */}
               <div className="absolute inset-0 flex justify-center items-center opacity-30">
                 <div className="w-px h-full bg-white"></div>
                 <div className="w-8 h-8 border border-white rounded-full absolute"></div>
               </div>
               <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-12 border border-white border-l-0"></div>
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-12 border border-white border-r-0"></div>
               
               {/* Bolinha */}
               <div 
                 className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] transition-all duration-1000 ease-in-out z-10"
                 style={{ 
                   left: `calc(${targetBallX}% - 6px)`,
                   top: `calc(${targetBallY}% - 6px)` 
                 }}
               ></div>
            </div>
          </div>
        </div>

        <div className="flex-[1.5] bg-[#161a16] border border-white/10 rounded-2xl p-6 flex flex-col shadow-lg overflow-hidden">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0 border-b border-white/10 pb-3">
            <Clock size={14} className="text-amarelo-gol" /> Minuto a Minuto
          </h3>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar pb-10">
            {fullLogs.map((log: any, i) => {
              if (log.team === 'neutral') {
                return (
                  <div key={i} className="p-3 rounded-xl text-xs font-bold uppercase tracking-widest text-center bg-white/5 text-white/40 border border-white/5">
                    {log.text}
                  </div>
                );
              }

              const isHome = log.team === 'player';
              let bgClass = isHome ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20';
              let textClass = isHome ? 'text-blue-200' : 'text-red-200';
              
              if (log.isGoal) {
                 bgClass = 'bg-amarelo-gol text-black shadow-[0_0_20px_rgba(234,179,8,0.3)] border-amarelo-gol';
                 textClass = 'text-black font-bold';
              }

              return (
                <div 
                  key={i} 
                  className={`p-4 rounded-xl text-sm leading-relaxed animate-fade-in-right border ${bgClass} ${textClass}`}
                >
                  {log.text}
                </div>
              );
            })}
            {fullLogs.length === 0 && (
              <div className="text-center text-white/40 text-sm mt-10">
                 O jogo vai começar...
              </div>
            )}
            
            {minute >= 90 && onClose && (
              <div className="mt-4 flex justify-center sticky bottom-0 bg-gradient-to-t from-[#161a16] pt-4 pb-2">
                <button 
                  onClick={onClose}
                  className="bg-amarelo-gol text-black px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-105 transition-transform"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
