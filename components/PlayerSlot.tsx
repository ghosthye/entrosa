import React, { useState } from 'react';
import { Lock, Star, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export type SlotStatus = 'empty' | 'selected' | 'filled' | 'revealed' | 'locked';

interface PlayerSlotProps {
  status: SlotStatus;
  positionLabel: string;
  playerName?: string;
  playerCountry?: string; // or code
  playerYear?: string | number;
  playerOvr?: number;
  onClick?: () => void;
  isError?: boolean;
  tooltipInfo?: string;
  faceUrl?: string | null;
}

export function PlayerSlot({ status, positionLabel, playerName, playerCountry, playerYear, playerOvr, onClick, isError, tooltipInfo, faceUrl }: PlayerSlotProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  let bgClass = 'bg-verde-campo border-cinza-borda/30 opacity-60 hover:opacity-100 cursor-pointer';
  let borderClass = 'border-2 border-dashed';
  
  if (status === 'locked') {
    bgClass = 'bg-preto/10 border-preto/10 opacity-40 cursor-not-allowed';
    borderClass = 'border-2 border-dotted';
  } else if (status === 'selected') {
    bgClass = 'bg-branco cursor-pointer';
    borderClass = 'border-2 border-amarelo-gol shadow-[0_0_15px_rgba(245,196,0,0.5)]';
  } else if (status === 'filled') {
    bgClass = 'bg-[#124d29] shadow-lg cursor-default';
    borderClass = 'border-2 border-[#1D9E75]';
  } else if (status === 'revealed') {
    bgClass = 'bg-verde-grama shadow-lg cursor-default';
    borderClass = 'border-2 border-[#FAFAF8]';
  }
  
  if (isError) {
    borderClass = 'border-2 border-vermelho-erro';
    bgClass = 'bg-red-900/20';
  }

  return (
    <motion.div 
      whileHover={(status === 'empty' || status === 'selected') ? { scale: 1.05 } : {}}
      whileTap={(status === 'empty' || status === 'selected') ? { scale: 0.95 } : {}}
      onClick={(status === 'empty' || status === 'selected') ? onClick : undefined}
      className={`relative w-24 h-28 sm:w-28 sm:h-32 rounded-lg flex flex-col items-center justify-center text-center p-2 transition-colors ${bgClass} ${borderClass}`}
    >
      <div className="text-xs font-mono font-bold text-white/60 mb-1 z-10 absolute top-1 left-1">
        {positionLabel}
      </div>
      
      {status === 'locked' && (
        <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white/30 mt-1" />
      )}
      
      {status === 'selected' && (
        <div className="text-xs sm:text-sm font-bold text-black mt-1 leading-tight">
          Escolher<br/>Jogador
        </div>
      )}

      {status === 'selected' && tooltipInfo && (
        <>
          <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-20">
            <div 
              onMouseEnter={() => setShowTooltip(true)} 
              onMouseLeave={() => setShowTooltip(false)}
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(!showTooltip);
              }}
              className="bg-amarelo-gol text-black rounded-full p-0.5 cursor-help hover:scale-110 transition-transform"
            >
              <HelpCircle size={14} className="stroke-[3]" />
            </div>
          </div>
          {showTooltip && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 sm:w-56 bg-black text-white text-[10px] sm:text-xs p-3 rounded-lg shadow-xl border border-amarelo-gol/50 font-sans text-left z-40 pointer-events-none">
              {tooltipInfo}
            </div>
          )}
        </>
      )}
      
      {(status === 'filled' || status === 'revealed') && (
        <div className="w-full h-full flex flex-col items-center justify-end relative">
          {playerOvr && (
            <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-black/60 text-amarelo-gol text-[9px] sm:text-[10px] font-mono font-bold px-1 rounded border border-amarelo-gol/30 z-20">
              {playerOvr}
            </div>
          )}

          {faceUrl ? (
            <img src={`/api/image?url=${encodeURIComponent(faceUrl)}`} alt={playerName} className="w-14 h-14 sm:w-16 sm:h-16 object-contain absolute bottom-8 sm:bottom-10 drop-shadow-md z-10" />
          ) : (
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-verde-grama flex items-center justify-center text-white font-display text-lg sm:text-xl absolute bottom-10 drop-shadow-md z-10 border border-amarelo-gol/50">
               {playerName?.charAt(0)}
             </div>
          )}

          <div className="w-full flex flex-col items-center z-20 bg-black/20 rounded pt-1">
            <div className="font-display text-[11px] sm:text-[13px] leading-tight text-white uppercase tracking-wide w-full overflow-hidden text-ellipsis whitespace-nowrap px-1">
              {playerName}
            </div>
            {status === 'revealed' && (
               <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amarelo-gol fill-current absolute -top-2 right-1/2 translate-x-1/2 z-30 drop-shadow-lg" />
            )}
          {playerCountry && (
             <div className={`mt-1 mb-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 ${getCountryStyles(playerCountry)}`}>
               <span>{getCountryCode(playerCountry)}</span>
               {playerYear && <span className="opacity-75">'{String(playerYear).slice(-2)}</span>}
             </div>
          )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function getCountryCode(country: string): string {
  const map: Record<string, string> = {
    'brazil': 'BR', 'argentina': 'ARG', 'spain': 'ESP', 'italy': 'ITA', 
    'france': 'FRA', 'germany': 'GER', 'england': 'ENG', 'netherlands': 'NED',
    'portugal': 'POR', 'uruguay': 'URU', 'belgium': 'BEL', 'croatia': 'CRO',
    'sweden': 'SWE', 'colombia': 'COL'
  };
  return map[country.toLowerCase()] || country.substring(0, 3).toUpperCase();
}

function getCountryStyles(country: string): string {
  const c = country.toLowerCase();
  switch (c) {
    case 'argentina':
    case 'uruguay':
      return 'bg-blue-500/40 text-blue-50 border border-blue-300/50';
    case 'brazil':
      return 'bg-yellow-500/40 text-yellow-50 border border-yellow-300/50';
    case 'spain':
    case 'portugal':
    case 'belgium':
    case 'wales':
      return 'bg-red-500/40 text-red-50 border border-red-300/50';
    case 'italy':
    case 'france':
      return 'bg-blue-700/50 text-blue-50 border border-blue-400/50';
    case 'germany':
      return 'bg-gray-200/30 text-white border border-gray-300/50';
    case 'netherlands':
      return 'bg-orange-500/40 text-orange-50 border border-orange-300/50';
    case 'england':
      return 'bg-white/20 text-white border border-red-500/50';
    case 'croatia':
      return 'bg-red-500/30 text-white border border-white/50';
    case 'sweden':
    case 'colombia':
      return 'bg-yellow-500/30 text-white border border-blue-500/50';
    default:
      return 'bg-black/30 text-branco/90 border border-transparent';
  }
}
