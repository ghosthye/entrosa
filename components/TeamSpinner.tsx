import React, { useState, useEffect } from 'react';

const SPINNER_TEAMS_BR = [
  'FLAMENGO 1981', 'SÃO PAULO 1992', 'PALMEIRAS 1999', 'VASCO 1998', 
  'SANTOS 2011', 'CRUZEIRO 2003', 'ATLÉTICO-MG 2013', 'GRÊMIO 1995', 
  'INTERNACIONAL 2006', 'FLUMINENSE 2012', 'CORINTHIANS 2012', 'SPORT 2008'
];

const SPINNER_TEAMS_WC = [
  'BRASIL 2002', 'FRANÇA 1998', 'ALEMANHA 2014', 'ITÁLIA 2006',
  'ARGENTINA 1986', 'ESPANHA 2010', 'HOLANDA 1974', 'BRASIL 1970',
  'INGLATERRA 1966', 'URUGUAI 1950', 'CROÁCIA 2018', 'PORTUGAL 2006'
];

export function TeamSpinner({ league = 'worldcup' }: { league?: 'worldcup' | 'brasileirao' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const teams = league === 'brasileirao' ? SPINNER_TEAMS_BR : SPINNER_TEAMS_WC;

  useEffect(() => {
    // Cycles rapidly through team names
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % teams.length);
    }, 100);

    return () => clearInterval(interval);
  }, [teams.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
      <div className="text-secondary text-sm font-bold uppercase tracking-[0.2em] mb-4">
        Sorteando Esquadrão...
      </div>
      <div className="h-24 overflow-hidden relative w-full max-w-md flex items-center justify-center bg-surface-light/50 border border-border-color rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-b from-surface via-transparent to-surface z-10 pointer-events-none"></div>
        <h2 className="font-display text-4xl text-primary transform scale-110 blur-[1px] transition-all duration-75">
          {teams[currentIndex]}
        </h2>
      </div>
    </div>
  );
}
