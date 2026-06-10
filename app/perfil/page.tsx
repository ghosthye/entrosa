"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadUserStats, UserStats, getTopPlayer, getTopConnection, getTopClub, getTopNation, getTopTactic } from '@/lib/storage';
import { Header } from '@/components/Header';
import { Trophy, Flame, UserCircle2, Activity, LogOut, Medal, Target, Swords } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';

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
  const [cloudStats, setCloudStats] = useState<any>(null);
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    // Carrega dados locais (anônimo)
    setStats(loadUserStats());
  }, []);

  useEffect(() => {
    // Se estiver logado, busca os dados reais da nuvem
    if (user && !user.is_anonymous) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setCloudStats(data);
        });
    } else {
      setCloudStats(null);
    }
  }, [user]);

  if (!stats) return null;

  // Entrosa (Links) Stats
  const topPlayer = cloudStats ? 
    (cloudStats.favorite_player ? [cloudStats.favorite_player, '?'] : null) : 
    getTopPlayer(stats);
    
  const topConn = cloudStats ? 
    (cloudStats.favorite_connection ? [cloudStats.favorite_connection, '?'] : null) : 
    getTopConnection(stats);

  const displayScore = cloudStats ? cloudStats.total_score : stats.totalScore;
  const displayStreak = cloudStats ? cloudStats.current_streak : stats.currentStreak;
  const displayMaxStreak = cloudStats ? cloudStats.highest_streak : stats.maxStreak;
  const completedPuzzles = cloudStats ? Math.max(1, Math.floor(displayScore / 50)) : stats.completedPuzzles;

  const avgScore = completedPuzzles > 0 
    ? Math.round(displayScore / completedPuzzles) 
    : 0;

  const displayFlawless = cloudStats ? cloudStats.flawless_puzzles : stats.flawlessPuzzles;
  const topClub = cloudStats ? (cloudStats.favorite_club ? [cloudStats.favorite_club, ''] : null) : getTopClub(stats);
  const topNation = cloudStats ? (cloudStats.favorite_nation ? [cloudStats.favorite_nation, ''] : null) : getTopNation(stats);
  const topTactic = cloudStats ? (cloudStats.favorite_tactic ? [cloudStats.favorite_tactic, ''] : null) : getTopTactic(stats);

  // Draft Stats (Only from cloud since Draft requires DB for persistence/leagues later)
  const draftTournamentsWon = cloudStats?.draft_tournaments_won || 0;
  const draftHighestOverall = cloudStats?.draft_highest_overall || 0;
  const draftTotalGoals = cloudStats?.draft_total_goals || 0;
  const draftTotalMatches = cloudStats?.draft_total_matches || 0;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-5xl mt-8">
        
        {/* CABEÇALHO DO PERFIL */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            {user && !user.is_anonymous && user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-amarelo-gol shadow-[0_0_15px_rgba(255,214,0,0.3)]" />
            ) : (
              <UserCircle2 size={72} className="text-secondary" />
            )}
            <div>
              <h1 className="font-display text-4xl sm:text-5xl text-primary uppercase tracking-wide">
                {user && !user.is_anonymous ? user.user_metadata?.full_name : 'Seu Perfil'}
              </h1>
              <p className="text-secondary font-medium text-sm sm:text-base">
                {user && !user.is_anonymous ? 'Estatísticas Salvas na Nuvem ☁️' : 'Estatísticas Locais de Carreira'}
              </p>
            </div>
          </div>
          
          {user && !user.is_anonymous && (
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 border border-red-500/20 hover:bg-red-500/10 py-2 px-4 rounded-lg transition-colors"
            >
              <LogOut size={16} /> Sair da Conta
            </button>
          )}
        </div>

        {(!user || user.is_anonymous) && (
          <div className="bg-amarelo-gol/10 border border-amarelo-gol/30 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-bold text-amarelo-gol text-lg mb-1">Proteja seu histórico!</h3>
              <p className="text-secondary text-sm">Seus dados estão salvos apenas neste navegador. Faça login para jogar as Ligas do Draft e não perder seu progresso.</p>
            </div>
            <button 
              onClick={signInWithGoogle}
              className="whitespace-nowrap bg-surface hover:bg-surface/80 text-primary font-bold py-3 px-6 border border-border-color rounded-xl shadow-sm flex items-center justify-center gap-3 transition-colors active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* COLUNA 1: ENTROSA CLÁSSICO */}
          <div className="bg-surface/50 border-2 border-verde-grama/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-verde-grama/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-verde-grama rounded-xl flex items-center justify-center text-black">
                <Activity size={20} />
              </div>
              <h2 className="font-display text-2xl text-primary uppercase tracking-widest">Puzzle Diário</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-surface border border-border-color p-4 rounded-xl flex flex-col items-center text-center">
                <Flame size={24} className="text-orange-500 mb-1" />
                <span className="text-3xl font-mono font-bold text-primary">{displayStreak}</span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Streak Atual</span>
              </div>
              <div className="bg-surface border border-border-color p-4 rounded-xl flex flex-col items-center text-center">
                <Trophy size={24} className="text-amarelo-gol mb-1" />
                <span className="text-3xl font-mono font-bold text-primary">{displayScore}</span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Pontos Acum.</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-surface border border-border-color rounded-lg">
                <span className="text-sm font-bold text-secondary uppercase">Média de Pts</span>
                <span className="font-mono text-xl text-primary">{avgScore}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface border border-border-color rounded-lg">
                <span className="text-sm font-bold text-secondary uppercase">Puzzles Perfeitos</span>
                <span className="font-mono text-xl text-primary">{displayFlawless}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface border border-border-color rounded-lg">
                <span className="text-sm font-bold text-secondary uppercase">Jogador Favorito</span>
                <span className="font-bold text-verde-grama truncate max-w-[150px]">{topPlayer ? topPlayer[0] : '-'}</span>
              </div>
            </div>
          </div>


          {/* COLUNA 2: MODO DRAFT */}
          <div className="bg-surface/50 border-2 border-blue-500/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Swords size={20} />
              </div>
              <h2 className="font-display text-2xl text-primary uppercase tracking-widest">Carreira Draft</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-surface border border-border-color p-4 rounded-xl flex flex-col items-center text-center relative overflow-hidden">
                <Medal size={24} className="text-yellow-400 mb-1 relative z-10" />
                <span className="text-3xl font-mono font-bold text-primary relative z-10">{draftTournamentsWon}</span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest relative z-10">Títulos</span>
                {draftTournamentsWon > 0 && <div className="absolute bottom-0 w-full h-1 bg-yellow-400"></div>}
              </div>
              <div className="bg-surface border border-border-color p-4 rounded-xl flex flex-col items-center text-center">
                <Target size={24} className="text-blue-400 mb-1" />
                <span className="text-3xl font-display text-blue-400">{draftHighestOverall}</span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Maior OVR</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-surface border border-border-color rounded-lg">
                <span className="text-sm font-bold text-secondary uppercase">Partidas Jogadas</span>
                <span className="font-mono text-xl text-primary">{draftTotalMatches}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface border border-border-color rounded-lg">
                <span className="text-sm font-bold text-secondary uppercase">Gols Pró Totais</span>
                <span className="font-mono text-xl text-primary">{draftTotalGoals}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface border border-border-color rounded-lg">
                <span className="text-sm font-bold text-secondary uppercase">Média de Gols/J</span>
                <span className="font-mono text-xl text-primary">
                  {draftTotalMatches > 0 ? (draftTotalGoals / draftTotalMatches).toFixed(1) : '0.0'}
                </span>
              </div>
            </div>

            {(!user || user.is_anonymous) && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-xs text-blue-300 text-center">
                Estatísticas de Draft requerem login para serem salvas.
              </div>
            )}
          </div>

        </div>

        <div className="mt-12 flex justify-center pb-12">
          <Link href="/">
            <button className="bg-surface border border-border-color hover:bg-surface/80 text-primary font-bold py-3 px-8 rounded-xl uppercase tracking-wider transition-transform active:scale-95 shadow-sm">
              Voltar ao Início
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
