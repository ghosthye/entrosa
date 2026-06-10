import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';

interface ScoreCardProps {
  score: number;
  maxScorePossible: number;
  chainLength: number;
  onShare: () => void;
  onPlayFree: () => void;
  nextTeaser?: string;
  streak?: number;
  isDuel?: boolean;
  onPlayCopa?: () => void;
  onRetry?: () => void;
}

export function ScoreCard({ score, maxScorePossible, chainLength, onShare, onPlayFree, nextTeaser, streak, isDuel, onPlayCopa, onRetry }: ScoreCardProps) {
  const { user, signInWithGoogle } = useAuth();
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (score > 0) {
      fetch(`/api/ranking?score=${score}`)
        .then(r => r.json())
        .then(data => {
          if (data.hypotheticalRank) setRank(data.hypotheticalRank);
        })
        .catch(console.error);
    }
  }, [score]);

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
        <>
          <h2 className="font-display text-3xl sm:text-4xl mb-2 text-verde-campo uppercase">Sua Seleção</h2>
          {streak && streak > 0 ? (
            <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full text-sm mb-2 shadow-sm border border-orange-200">
              🔥 {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </div>
          ) : null}
        </>
      )}
      
      <div className="my-6">
        <div className="text-5xl sm:text-6xl font-mono font-bold text-amarelo-gol drop-shadow-sm">
          {score}
        </div>
        <div className="text-xs sm:text-sm text-cinza-borda font-bold uppercase mt-1 tracking-wider">Pontos</div>
      </div>

      <div className="bg-cinza-leve rounded-lg p-4 mb-6 text-sm flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-cinza-borda">Ranking:</span>
          <span className="font-bold text-preto">{rating}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-cinza-borda">Jogadores:</span>
          <span className="font-bold text-preto">{chainLength} / 11</span>
        </div>
      </div>
      
      {nextTeaser && chainLength === 11 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-blue-800 font-bold italic">{nextTeaser}</p>
        </div>
      )}

      {(!user || user.is_anonymous) && !isDuel && chainLength === 11 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h4 className="font-bold text-purple-900 text-lg leading-tight">
              {rank ? `Seu score te coloca no Top ${rank} do Brasil!` : 'Não perca seu histórico!'}
            </h4>
          </div>
          <p className="text-xs text-purple-800 mb-4">
            Crie uma conta gratuita para eternizar seu nome no Ranking Global e não perder os seus dados.
          </p>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 border border-gray-300 rounded shadow-sm flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Salvar meu Score no Ranking
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {chainLength === 11 && onPlayCopa && (
          <button 
            onClick={onPlayCopa}
            className="w-full bg-amarelo-gol hover:bg-yellow-400 text-preto font-bold py-3 sm:py-4 rounded-lg uppercase tracking-wider transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
          >
            <span className="text-xl">🏆</span> Disputar Copa
          </button>
        )}
        {!isDuel && chainLength === 11 && (
          <Link href="/duelo">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-4 rounded-lg uppercase tracking-wider transition-transform active:scale-95 shadow-md">
              ⚔️ Desafiar Amigo
            </button>
          </Link>
        )}
        {chainLength < 11 && onRetry && (
          <button 
            onClick={onRetry}
            className="w-full bg-vermelho-erro hover:bg-red-700 text-branco font-bold py-3 sm:py-4 rounded-lg uppercase tracking-wider transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
          >
            🔄 Tentar Novamente
          </button>
        )}
        {!isDuel && (
          <button 
            onClick={onPlayFree}
            className="w-full bg-verde-campo hover:bg-[#124d29] text-branco font-bold py-3 sm:py-4 rounded-lg uppercase tracking-wider transition-transform active:scale-95"
          >
            Jogar Modo Livre
          </button>
        )}
      </div>
    </motion.div>
  );
}
