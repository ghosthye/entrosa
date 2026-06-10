"use client";

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/useAuth';

export default function RankingPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    fetch('/api/ranking', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar ranking. Verifique o banco de dados (RLS).');
        return res.json();
      })
      .then(data => {
        setLeaderboard(data.topPlayers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-3xl mt-8">
        <h1 className="font-display text-5xl md:text-6xl text-verde-campo text-center uppercase mb-2">Hall da Fama</h1>
        <p className="text-secondary text-center mb-10">Os técnicos mais vitoriosos do Entrosa</p>

        {(!user || user.is_anonymous) && (
          <div className="bg-surface border-2 border-amarelo-gol rounded-xl p-6 text-center shadow-lg mb-10 flex flex-col items-center">
            <Trophy className="w-12 h-12 text-amarelo-gol mb-4" />
            <h2 className="text-xl font-bold mb-2">Salve seu Score no Ranking!</h2>
            <p className="text-secondary mb-6 text-sm max-w-md">Você está jogando como anônimo. Faça login para ter seu nome imortalizado no nosso Hall da Fama e competir contra a comunidade.</p>
            <button 
              onClick={signInWithGoogle}
              className="bg-amarelo-gol text-black font-bold uppercase tracking-wider px-8 py-3 rounded-lg hover:scale-105 transition-transform"
            >
              Fazer Login com Google
            </button>
          </div>
        )}

        <div className="bg-surface rounded-2xl border border-border-color shadow-xl overflow-hidden">
          {error ? (
            <div className="p-10 text-center text-vermelho-erro">{error}</div>
          ) : loading ? (
            <div className="p-10 text-center text-secondary animate-pulse">Carregando os maiores de todos os tempos...</div>
          ) : (
            <div className="flex flex-col">
              {leaderboard.map((p, idx) => (
                <div key={p.id} className={`flex items-center p-4 sm:p-6 border-b border-border-color last:border-0 ${idx < 3 ? 'bg-amarelo-gol/5' : ''}`}>
                  <div className="w-12 font-display text-2xl sm:text-3xl text-center font-bold text-cinza-borda mr-4 flex justify-center">
                    {idx === 0 ? <Crown className="w-8 h-8 text-yellow-500" /> : 
                     idx === 1 ? <Medal className="w-8 h-8 text-gray-400" /> : 
                     idx === 2 ? <Medal className="w-8 h-8 text-amber-700" /> : 
                     `#${idx + 1}`}
                  </div>
                  
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="w-12 h-12 rounded-full border border-border-color shadow-sm mr-4" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-verde-grama flex items-center justify-center text-white font-bold mr-4 text-xl">
                      {p.name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="font-bold text-lg">{p.name}</div>
                    <div className="text-xs text-secondary flex gap-3 mt-1">
                      <span>Puzzles Perfeitos: <strong className="text-primary">{p.flawless_puzzles}</strong></span>
                      <span>Total Pts: <strong className="text-amarelo-gol">{p.total_score}</strong></span>
                    </div>
                  </div>

                  {idx === 0 && (
                     <div className="hidden sm:flex text-xs font-bold text-yellow-500 uppercase tracking-widest border border-yellow-500/30 px-3 py-1 rounded-full bg-yellow-500/10">
                       Líder Isolado
                     </div>
                  )}
                </div>
              ))}
              
              {leaderboard.length === 0 && (
                <div className="p-10 text-center text-secondary">Ainda não há ninguém no Hall da Fama. Seja o primeiro!</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
