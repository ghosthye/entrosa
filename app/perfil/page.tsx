"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadUserStats, UserStats, getTopPlayer, getTopConnection, getTopClub, getTopNation, getTopTactic } from '@/lib/storage';
import { Header } from '@/components/Header';
import { Trophy, Flame, UserCircle2, Activity, Link as LinkIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
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

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-4xl mt-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            {user && !user.is_anonymous && user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full border-4 border-amarelo-gol shadow-md" />
            ) : (
              <UserCircle2 size={64} className="text-amarelo-gol" />
            )}
            <div>
              <h1 className="font-display text-4xl text-primary uppercase tracking-wide">
                {user && !user.is_anonymous ? user.user_metadata?.full_name : 'Seu Perfil'}
              </h1>
              <p className="text-secondary font-medium">
                {user && !user.is_anonymous ? 'Estatísticas Salvas na Nuvem ☁️' : 'Estatísticas de Carreira no ENTROSA'}
              </p>
            </div>
          </div>
          
          {user && !user.is_anonymous && (
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 border border-red-200 hover:bg-red-50 py-2 px-3 rounded transition-colors"
            >
              <LogOut size={14} /> Sair da Conta
            </button>
          )}
        </div>

        {(!user || user.is_anonymous) && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-bold text-purple-900 text-lg mb-1">Proteja seu histórico!</h3>
              <p className="text-purple-800 text-sm">Seus dados estão salvos apenas neste navegador. Crie uma conta gratuita para não perder seu progresso e jogar em outros dispositivos.</p>
            </div>
            <button 
              onClick={signInWithGoogle}
              className="whitespace-nowrap bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 border border-gray-300 rounded-lg shadow-sm flex items-center justify-center gap-3 transition-colors active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <Flame size={32} className="text-orange-500 mb-2" />
            <span className="text-4xl font-mono font-bold text-primary">{displayStreak}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Streak Atual</span>
            <span className="text-[10px] text-cinza-borda mt-1">Máximo: {displayMaxStreak}</span>
          </div>

          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <Trophy size={32} className="text-amarelo-gol mb-2" />
            <span className="text-4xl font-mono font-bold text-primary">{displayScore}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Pontos Acumulados</span>
          </div>

          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <Activity size={32} className="text-verde-grama mb-2" />
            <span className="text-4xl font-mono font-bold text-primary">{avgScore}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Média de Pontos</span>
          </div>

          <div className="bg-surface border border-border-color p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <span className="text-3xl mb-2">⚽</span>
            <span className="text-4xl font-mono font-bold text-primary">{cloudStats ? 'N/A' : Object.keys(stats.playersUsed).length}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Jogadores Únicos</span>
          </div>
        </div>

        <div className="mb-4 mt-8">
          <h2 className="text-xl font-bold text-primary uppercase tracking-wide mb-4">Meus Favoritos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#2A2A2A] border border-[#3A3A3A] p-4 rounded-xl shadow-sm">
              <h3 className="font-bold text-sm text-secondary mb-1">Jogador</h3>
              {topPlayer ? (
                <>
                  <div className="font-bold text-primary text-lg leading-tight truncate">{topPlayer[0]}</div>
                  <div className="text-xs text-[#888888] mt-1">{topPlayer[1]} {topPlayer[1] !== '' && 'vezes'}</div>
                </>
              ) : <div className="text-sm text-[#888888] italic">Jogue mais!</div>}
            </div>

            <div className="bg-[#2A2A2A] border border-[#3A3A3A] p-4 rounded-xl shadow-sm">
              <h3 className="font-bold text-sm text-secondary mb-1">Conexão</h3>
              {topConn ? (
                <>
                  <div className="font-bold text-primary text-lg leading-tight truncate">{RULE_LABELS[topConn[0]] || topConn[0]}</div>
                  <div className="text-xs text-[#888888] mt-1">{topConn[1]} {topConn[1] !== '' && 'vezes'}</div>
                </>
              ) : <div className="text-sm text-[#888888] italic">Jogue mais!</div>}
            </div>

            <div className="bg-[#2A2A2A] border border-[#3A3A3A] p-4 rounded-xl shadow-sm">
              <h3 className="font-bold text-sm text-secondary mb-1">Clube</h3>
              {topClub ? (
                <>
                  <div className="font-bold text-primary text-lg leading-tight truncate">{topClub[0]}</div>
                  <div className="text-xs text-[#888888] mt-1">{topClub[1]} {topClub[1] !== '' && 'vezes'}</div>
                </>
              ) : <div className="text-sm text-[#888888] italic">Jogue mais!</div>}
            </div>

            <div className="bg-[#2A2A2A] border border-[#3A3A3A] p-4 rounded-xl shadow-sm">
              <h3 className="font-bold text-sm text-secondary mb-1">Seleção</h3>
              {topNation ? (
                <>
                  <div className="font-bold text-primary text-lg leading-tight truncate">{topNation[0]}</div>
                  <div className="text-xs text-[#888888] mt-1">{topNation[1]} {topNation[1] !== '' && 'vezes'}</div>
                </>
              ) : <div className="text-sm text-[#888888] italic">Jogue mais!</div>}
            </div>

            <div className="bg-[#2A2A2A] border border-[#3A3A3A] p-4 rounded-xl shadow-sm col-span-2 md:col-span-1">
              <h3 className="font-bold text-sm text-secondary mb-1">Tática</h3>
              {topTactic ? (
                <>
                  <div className="font-bold text-primary text-lg leading-tight truncate">{topTactic[0]}</div>
                  <div className="text-xs text-[#888888] mt-1">{topTactic[1]} {topTactic[1] !== '' && 'vezes'}</div>
                </>
              ) : <div className="text-sm text-[#888888] italic">Jogue mais!</div>}
            </div>
          </div>
        </div>

        <div className="mt-8 mb-4">
          <h2 className="text-xl font-bold text-primary uppercase tracking-wide mb-4">Conquistas</h2>
          <div className="flex flex-wrap gap-3">
            {/* Top 100 Global */}
            <button 
              onClick={() => alert(displayScore > 1000 ? "🏆 Conquista Desbloqueada: Lenda do Ranking!\n\nVocê alcançou mais de 1000 pontos totais no jogo." : "🔒 Conquista Bloqueada: Lenda do Ranking\n\nAlcance mais de 1000 pontos no total jogando os puzzles.")}
              className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all duration-500 flex items-center gap-2 cursor-pointer ${displayScore > 1000 ? 'bg-[#FFF8E7] text-[#8B5E34] border-[#D4A373] shadow-[0_0_15px_rgba(212,163,115,0.4)] scale-105 hover:scale-110' : 'bg-[#2A2A2A] text-[#555] border-[#3A3A3A] grayscale hover:bg-[#333]'}`}
            >
              <Trophy size={16} /> Lenda do Ranking
            </button>
            
            {/* Streak 10+ */}
            <button 
              onClick={() => alert(displayMaxStreak >= 10 ? "🔥 Conquista Desbloqueada: Streak 10+!\n\nVocê venceu 10 jogos seguidos sem quebrar a ofensiva." : "🔒 Conquista Bloqueada: Streak 10+\n\nVença 10 puzzles seguidos sem quebrar a ofensiva diária para desbloquear.")}
              className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all duration-500 flex items-center gap-2 cursor-pointer ${displayMaxStreak >= 10 ? 'bg-[#E6F4EA] text-[#1E8E3E] border-[#81C995] shadow-[0_0_15px_rgba(129,201,149,0.4)] scale-105 hover:scale-110' : 'bg-[#2A2A2A] text-[#555] border-[#3A3A3A] grayscale hover:bg-[#333]'}`}
            >
              <Flame size={16} /> Streak 10+
            </button>

            {/* Mestre dos Clubes */}
            <button 
              onClick={() => alert(stats.connectionsUsed['club_same_year'] >= 20 || stats.connectionsUsed['club_any_year'] >= 20 ? "👕 Conquista Desbloqueada: Mestre dos Clubes!\n\nVocê usou conexões de Mesmo Clube mais de 20 vezes." : "🔒 Conquista Bloqueada: Mestre dos Clubes\n\nUse a conexão de 'Mesmo Clube' mais de 20 vezes nas suas jogadas para desbloquear.")}
              className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all duration-500 flex items-center gap-2 cursor-pointer ${stats.connectionsUsed['club_same_year'] >= 20 || stats.connectionsUsed['club_any_year'] >= 20 ? 'bg-[#E8F0FE] text-[#1967D2] border-[#8AB4F8] shadow-[0_0_15px_rgba(138,180,248,0.4)] scale-105 hover:scale-110' : 'bg-[#2A2A2A] text-[#555] border-[#3A3A3A] grayscale hover:bg-[#333]'}`}
            >
              <span className="text-lg leading-none">👕</span> Mestre dos clubes
            </button>

            {/* Sem erros */}
            <button 
              onClick={() => alert(displayFlawless > 0 ? "⭐ Conquista Desbloqueada: Sem Erros!\n\nVocê completou um puzzle inteiro sem cometer nenhum erro." : "🔒 Conquista Bloqueada: Sem Erros\n\nComplete um puzzle e feche todo o elenco com 0 erros cometidos para desbloquear.")}
              className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all duration-500 flex items-center gap-2 cursor-pointer ${displayFlawless > 0 ? 'bg-[#F3E8FD] text-[#681DA8] border-[#C58AF9] shadow-[0_0_15px_rgba(197,138,249,0.4)] scale-105 hover:scale-110' : 'bg-[#2A2A2A] text-[#555] border-[#3A3A3A] grayscale hover:bg-[#333]'}`}
            >
              <span className="text-lg leading-none">⭐</span> Sem erros
            </button>
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
