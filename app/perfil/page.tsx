"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadUserStats, UserStats, getTopPlayer, getTopConnection } from '@/lib/storage';
import { Header } from '@/components/Header';
import { Trophy, Flame, UserCircle2, Activity, Link as LinkIcon } from 'lucide-react';
import { ConnectionRule } from '@/lib/rules';

const RULE_LABELS: Record<string, string> = {
  'national_team_same_year': 'Seleção (Mesmo Ano)',
  'opponent_same_match': 'Adversários na Partida',
  'club_same_year': 'Clube (Mesmo Ano)',
  'national_team_any_year': 'Seleção (Qualquer Ano)',
  'club_any_year': 'Clube (Qualquer Ano)',
  'same_cup': 'Mesma Copa',
  'same_continent': 'Continente',
  'same_position': 'Posição',
  'same_language': 'Idioma'
};

export default function PerfilPage() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    setStats(loadUserStats());
  }, []);

  if (!stats) return null;

  const topPlayer = getTopPlayer(stats);
  const topConn = getTopConnection(stats);

  const avgScore = stats.completedPuzzles > 0 
    ? Math.round(stats.totalScore / stats.completedPuzzles) 
    : 0;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-4xl mt-12">
        <div className="flex items-center gap-4 mb-8">
          <UserCircle2 size={48} className="text-amarelo-gol" />
          <div>
            <h1 className="font-display text-4xl text-primary uppercase tracking-wide">Seu Perfil</h1>
            <p className="text-secondary font-medium">Estatísticas de Carreira no ENTROSA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <Flame size={32} className="text-orange-500 mb-2" />
            <span className="text-4xl font-mono font-bold text-primary">{stats.currentStreak}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Streak Atual</span>
            <span className="text-[10px] text-cinza-borda mt-1">Máximo: {stats.maxStreak}</span>
          </div>

          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <Trophy size={32} className="text-amarelo-gol mb-2" />
            <span className="text-4xl font-mono font-bold text-primary">{stats.completedPuzzles}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Puzzles Completos</span>
          </div>

          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <Activity size={32} className="text-verde-grama mb-2" />
            <span className="text-4xl font-mono font-bold text-primary">{avgScore}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Média de Pontos</span>
          </div>

          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <span className="text-3xl mb-2">⚽</span>
            <span className="text-4xl font-mono font-bold text-primary">{Object.keys(stats.playersUsed).length}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Jogadores Únicos</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-border-color p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <UserCircle2 size={120} />
            </div>
            <h3 className="font-bold text-lg text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-amarelo-gol">#1</span> Jogador Favorito
            </h3>
            {topPlayer ? (
              <div>
                <div className="font-display text-3xl text-primary">{topPlayer[0]}</div>
                <div className="text-secondary font-medium mt-1">Escalado {topPlayer[1]} vezes</div>
              </div>
            ) : (
              <div className="text-secondary italic">Jogue para descobrir!</div>
            )}
          </div>

          <div className="bg-surface border border-border-color p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <LinkIcon size={120} />
            </div>
            <h3 className="font-bold text-lg text-primary uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-amarelo-gol">#1</span> Tática Favorita
            </h3>
            {topConn ? (
              <div>
                <div className="font-display text-2xl text-primary">{RULE_LABELS[topConn[0]] || topConn[0]}</div>
                <div className="text-secondary font-medium mt-1">Usada {topConn[1]} vezes</div>
              </div>
            ) : (
              <div className="text-secondary italic">Jogue para descobrir!</div>
            )}
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Link href="/">
            <button className="bg-amarelo-gol hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl uppercase tracking-wider transition-transform active:scale-95 shadow-sm">
              Voltar ao Início
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
