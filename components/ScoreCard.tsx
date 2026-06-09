import React from 'react';
import { motion } from 'framer-motion';

interface ScoreCardProps {
  score: number;
  maxScorePossible: number;
  chainLength: number;
  onShare: () => void;
  onPlayFree: () => void;
}

export function ScoreCard({ score, maxScorePossible, chainLength, onShare, onPlayFree }: ScoreCardProps) {
  const percentage = Math.round((score / maxScorePossible) * 100) || 0;
  
  let rating = 'Iniciante';
  if (percentage >= 80) rating = 'Lendário 🏆';
  else if (percentage >= 60) rating = 'Ouro 🥇';
  else if (percentage >= 40) rating = 'Prata 🥈';
  else if (percentage >= 20) rating = 'Bronze 🥉';

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className={`bg-branco text-preto p-6 sm:p-8 rounded-2xl shadow-2xl border-4 w-full max-w-sm mx-auto text-center ${chainLength < 11 ? 'border-vermelho-erro' : 'border-verde-grama'}`}
    >
      {chainLength < 11 ? (
        <>
          <h2 className="font-display text-3xl sm:text-4xl mb-1 text-vermelho-erro uppercase">Fim de Jogo</h2>
          <p className="text-sm font-bold text-cinza-borda mb-2 uppercase tracking-wide">Você ficou encurralado sem conexões adjacentes!</p>
        </>
      ) : (
        <h2 className="font-display text-3xl sm:text-4xl mb-2 text-verde-campo uppercase">Sua Seleção</h2>
      )}
      
      <div className="my-6">
        <div className="text-5xl sm:text-6xl font-mono font-bold text-amarelo-gol drop-shadow-sm">
          {score}
        </div>
        <div className="text-xs sm:text-sm text-cinza-borda font-bold uppercase mt-1 tracking-wider">Pontos</div>
      </div>

      <div className="bg-cinza-leve rounded-lg p-4 mb-6 text-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-cinza-borda">Ranking:</span>
          <span className="font-bold text-preto">{rating}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-cinza-borda">Jogadores:</span>
          <span className="font-bold text-preto">{chainLength} / 11</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button 
          onClick={onShare}
          className="w-full bg-amarelo-gol hover:bg-yellow-400 text-preto font-bold py-3 sm:py-4 rounded-lg uppercase tracking-wider transition-transform active:scale-95"
        >
          Compartilhar Score
        </button>
        <button 
          onClick={onPlayFree}
          className="w-full bg-verde-campo hover:bg-[#124d29] text-branco font-bold py-3 sm:py-4 rounded-lg uppercase tracking-wider transition-transform active:scale-95"
        >
          Jogar Modo Livre
        </button>
      </div>
    </motion.div>
  );
}
