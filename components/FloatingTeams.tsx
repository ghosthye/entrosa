'use client';

import React, { useEffect, useState } from 'react';

const LEGENDARY_TEAMS = [
  'BRASIL 1970', 'HOLANDA 1974', 'ALEMANHA 2014', 'FRANÇA 1998', 
  'BRASIL 2002', 'ARGENTINA 1986', 'ESPANHA 2010', 'ITÁLIA 1982',
  'URUGUAI 1950', 'ITÁLIA 2006', 'INGLATERRA 1966', 'FRANÇA 2018',
  'ARGENTINA 2022', 'BRASIL 1958', 'BRASIL 1994', 'ALEMANHA 1990'
];

interface FloatingItem {
  id: number;
  text: string;
  left: string;
  animationDuration: string;
  animationDelay: string;
  fontSize: string;
  opacity: number;
}

// Fisher-Yates shuffle
function shuffle(array: string[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function FloatingTeams() {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    // Escolher apenas 8 seleções
    const selectedTeams = shuffle(LEGENDARY_TEAMS).slice(0, 8);
    
    // Dividir a tela em 8 colunas para evitar sobreposição
    const columnWidth = 100 / 8;

    const generatedItems = selectedTeams.map((team, i) => {
      // Posição baseada na coluna, com um pequeno random para não ficar rígido
      const colStart = i * columnWidth;
      const leftPos = colStart + (Math.random() * (columnWidth - 5));

      return {
        id: i,
        text: team,
        left: `${leftPos}%`,
        animationDuration: `${Math.random() * 25 + 30}s`, // 30s to 55s (mais lento)
        animationDelay: `${Math.random() * -40}s`, // Delay negativo bem grande pra espalhar verticalmente
        fontSize: `${Math.random() * 1.5 + 1.5}rem`, // 1.5rem to 3rem
        opacity: Math.random() * 0.05 + 0.09, // 0.09 to 0.14 (ainda mais visível)
      };
    });
    setItems(generatedItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {items.map(item => (
        <div
          key={item.id}
          className="absolute whitespace-nowrap font-display text-black dark:text-amarelo-gol uppercase animate-float-bg"
          style={{
            left: item.left,
            top: '100%',
            opacity: item.opacity,
            fontSize: item.fontSize,
            animationDuration: item.animationDuration,
            animationDelay: item.animationDelay,
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
