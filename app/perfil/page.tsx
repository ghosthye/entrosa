"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadUserStats, UserStats } from '@/lib/storage';
import { Header } from '@/components/Header';
import { Trophy, Flame, UserCircle2, Activity, LogOut, Medal, Target, Swords, Users, Star, Lock, Calendar, CheckCircle2, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function PerfilPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [cloudStats, setCloudStats] = useState<any>(null);
  const [saves, setSaves] = useState<any[]>([]);
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'carreira' | 'puzzle' | 'conquistas'>('carreira');
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    setStats(loadUserStats());
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (user && !user.is_anonymous) {
        const [{ data: profile }, { data: savesData }, { data: puzzlesData }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('saves').select('save_name, mode, status, custom_team_name, team_overall, final_position, is_champion, competition_state, last_synced_at').eq('user_id', user.id).eq('status', 'finished').order('last_synced_at', { ascending: false }),
          supabase.from('user_puzzles').select('start_time, completed').eq('user_id', user.id)
        ]);

        if (profile) setCloudStats(profile);
        if (savesData) setSaves(savesData);
        if (puzzlesData) setPuzzles(puzzlesData);
      } else {
        setCloudStats(null);
        setSaves([]);
        setPuzzles([]);
      }
    };
    loadData();
  }, [user]);

  if (!stats) return null;

  // Basic Metrics
  const displayScore = cloudStats ? cloudStats.total_score : stats.totalScore;
  const displayStreak = cloudStats ? cloudStats.current_streak : stats.currentStreak;
  const completedPuzzles = cloudStats ? Math.max(1, Math.floor(displayScore / 50)) : stats.completedPuzzles;
  const avgScore = completedPuzzles > 0 ? Math.round(displayScore / completedPuzzles) : 0;
  const displayFlawless = cloudStats ? cloudStats.flawless_puzzles : stats.flawlessPuzzles;

  // Draft Metrics
  const draftTournamentsWon = cloudStats?.draft_tournaments_won || 0;
  const draftHighestOverall = cloudStats?.draft_highest_overall || 0;
  const draftTotalGoals = cloudStats?.draft_total_goals || 0;
  const draftGoalsConceded = cloudStats?.draft_goals_conceded || 0;
  const draftTotalMatches = cloudStats?.draft_total_matches || 0;
  const draftAvgGoals = draftTotalMatches > 0 ? (draftTotalGoals / draftTotalMatches).toFixed(1) : '0.0';
  const goalDiff = draftTotalGoals - draftGoalsConceded;
  const draftsPlayed = saves.length;

  // Achievements Logic
  const hasInvicto = saves.some(s => s.is_champion); // Simplify for now
  const hasStreak = displayStreak >= 7;
  const hasMultiplayer = cloudStats?.draft_total_matches > 0; // Mock condition
  const hasOvr90 = draftHighestOverall >= 90;
  const hasPuzzle30 = completedPuzzles >= 30;
  const hasGalactico = draftHighestOverall >= 95;
  const hasHatTrick = draftTournamentsWon >= 3;
  const hasTop10 = draftTournamentsWon >= 10;

  // Activity Grid (Last 14 days)
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0,0,0,0);
    return d;
  });

  const getActivityLevel = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const played = puzzles.filter(p => p.start_time.startsWith(dateStr));
    if (played.length === 0) return 0; // none
    if (played.some(p => p.completed)) return 2; // win
    return 1; // played but lost
  };

  const isToday = (date: Date) => {
    return date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  };

  // OVR Chart
  const last4Seasons = saves.slice(0, 4).reverse();
  const maxOvrChart = Math.max(95, ...last4Seasons.map(s => s.team_overall));

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-5xl mt-8 flex flex-col gap-8">
        
        {/* HERO SECTION */}
        <div className="bg-[#0a0f0a] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 relative overflow-hidden">
          {/* Fundo Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amarelo-gol/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 w-full">
            <div className="relative shrink-0">
              {user && !user.is_anonymous && user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#1a231a] shadow-lg object-cover" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#1a231a] bg-black/40 flex items-center justify-center shadow-lg">
                  <UserCircle2 size={48} className="text-white/20" />
                </div>
              )}
              {draftTournamentsWon > 0 && (
                <div className="absolute -bottom-2 -right-2 bg-amarelo-gol text-black p-1.5 rounded-full border-2 border-background shadow-lg">
                  <Trophy size={16} className="fill-black" />
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center sm:items-start flex-1 w-full">
              <div className="flex items-center justify-between w-full">
                <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wide">
                  {user && !user.is_anonymous ? user.user_metadata?.full_name : 'Seu Perfil'}
                </h1>
                {user && !user.is_anonymous && (
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="hidden sm:flex text-xs font-bold text-white/30 hover:text-red-400 uppercase tracking-wider items-center gap-1 hover:bg-white/5 py-2 px-3 rounded-lg transition-colors"
                  >
                    <LogOut size={14} /> Sair
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-white/40 mt-1 mb-4 font-mono uppercase tracking-widest">
                {user && !user.is_anonymous ? (
                  <>
                    <Activity size={12} className="text-blue-400" />
                    <span>Salvo na nuvem • Desde {new Date(user.created_at).getFullYear()}</span>
                  </>
                ) : (
                  <>
                    <Calendar size={12} />
                    <span>Progresso Local (Anônimo)</span>
                  </>
                )}
              </div>

              {/* Total Points Badge */}
              <div className="flex items-center gap-2 px-4 py-1.5 bg-[#1a231a] border border-verde-grama/30 rounded-full text-verde-grama font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.1)] mb-4">
                <Star size={16} className="fill-verde-grama" />
                <span>{displayScore.toLocaleString('pt-BR')} pontos acumulados</span>
              </div>

              {/* Inline Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {draftTournamentsWon > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <Trophy size={12} /> Campeão
                  </div>
                )}
                {hasStreak && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <Flame size={12} /> 7 Dias
                  </div>
                )}
                {hasMultiplayer && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <Users size={12} /> Multiplayer
                  </div>
                )}
                {hasPuzzle30 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <LayoutGrid size={12} /> Puzzle Pro
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LOGIN PROMPT */}
        {(!user || user.is_anonymous) && (
          <div className="bg-amarelo-gol/10 border border-amarelo-gol/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-bold text-amarelo-gol text-lg mb-1">Proteja seu histórico!</h3>
              <p className="text-secondary text-sm">Seus dados estão salvos apenas neste navegador. Faça login para desbloquear Multiplayer e Cloud Save.</p>
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

        {/* 4 KPIs GLOBALS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0a0f0a] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-display text-yellow-500 mb-1">{draftTournamentsWon}</span>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Títulos</span>
          </div>
          <div className="bg-[#0a0f0a] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-display text-verde-grama mb-1">{draftTotalGoals}</span>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Gols</span>
          </div>
          <div className="bg-[#0a0f0a] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-display text-blue-400 mb-1">{draftsPlayed}</span>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Drafts</span>
          </div>
          <div className="bg-[#0a0f0a] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-display text-purple-400 mb-1">{draftHighestOverall}</span>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">OVR Máx</span>
          </div>
        </div>

        {/* MOBILE TABS */}
        <div className="flex lg:hidden bg-[#0a0f0a] border border-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('carreira')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${activeTab === 'carreira' ? 'bg-white/10 text-white' : 'text-white/30'}`}
          >
            Carreira
          </button>
          <button 
            onClick={() => setActiveTab('puzzle')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${activeTab === 'puzzle' ? 'bg-white/10 text-white' : 'text-white/30'}`}
          >
            Puzzle
          </button>
          <button 
            onClick={() => setActiveTab('conquistas')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${activeTab === 'conquistas' ? 'bg-white/10 text-white' : 'text-white/30'}`}
          >
            Conquistas
          </button>
        </div>

        {/* DENSE 2-COLUMN LAYOUT (DESKTOP) / TAB CONTENT (MOBILE) */}
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          
          {/* COLUNA ESQUERDA: CARREIRA DRAFT */}
          <div className={`flex-1 flex flex-col gap-8 ${activeTab === 'carreira' ? 'block' : 'hidden lg:flex'}`}>
            
            {/* ESTATÍSTICAS NUMÉRICAS */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Swords size={18} className="text-white/30" />
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Estatísticas</h2>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors rounded-t-xl border border-white/5 border-b-0">
                  <span className="text-sm font-bold text-white/60 flex items-center gap-2"><Medal size={14} className="text-white/30"/> Títulos</span>
                  <span className="font-mono text-lg text-yellow-500 font-bold">{draftTournamentsWon}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/5 border-b-0">
                  <span className="text-sm font-bold text-white/60 flex items-center gap-2"><Target size={14} className="text-white/30"/> Gols feitos</span>
                  <span className="font-mono text-lg text-verde-grama font-bold">{draftTotalGoals}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/5 border-b-0">
                  <span className="text-sm font-bold text-white/60 flex items-center gap-2"><Target size={14} className="text-white/30 rotate-180"/> Gols sofridos</span>
                  <span className="font-mono text-lg text-red-400 font-bold">{draftGoalsConceded}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/5 border-b-0">
                  <span className="text-sm font-bold text-white/60 flex items-center gap-2"><Activity size={14} className="text-white/30"/> Saldo de gols</span>
                  <span className={`font-mono text-lg font-bold ${goalDiff > 0 ? 'text-verde-grama' : goalDiff < 0 ? 'text-red-400' : 'text-white'}`}>
                    {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/5 border-b-0">
                  <span className="text-sm font-bold text-white/60 flex items-center gap-2"><LayoutGrid size={14} className="text-white/30"/> Média gols/draft</span>
                  <span className="font-mono text-lg text-white font-bold">{draftAvgGoals}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors rounded-b-xl border border-white/5">
                  <span className="text-sm font-bold text-white/60 flex items-center gap-2"><UserCircle2 size={14} className="text-white/30"/> Maior OVR</span>
                  <span className="font-mono text-lg text-purple-400 font-bold">{draftHighestOverall}</span>
                </div>
              </div>
            </div>

            {/* HISTÓRICO DE TEMPORADAS */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Calendar size={18} className="text-white/30" />
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Histórico de Temporadas</h2>
              </div>
              
              <div className="flex flex-col gap-3">
                {saves.length === 0 ? (
                  <div className="text-center py-10 bg-white/5 border border-white/5 rounded-xl text-white/30 text-xs font-mono uppercase tracking-widest">
                    Nenhum draft finalizado ainda.
                  </div>
                ) : (
                  saves.slice(0, 5).map((save, idx) => {
                    const isCamp = save.is_champion;
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-[#0a0f0a] border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-sm ${isCamp ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                            {save.final_position}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">{save.custom_team_name}</span>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">OVR {save.team_overall} • {save.mode === 'worldcup' ? 'Copa' : 'Liga'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-sm ${isCamp ? 'text-yellow-500' : 'text-white/70'}`}>
                            {save.is_champion ? 'Campeão' : save.mode === 'brasileirao' ? `${save.season_goals} pts` : 'Eliminado'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                {saves.length > 5 && (
                  <div className="w-full flex justify-center mt-2">
                    <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                      <LogOut size={16} className="text-white/40 rotate-90" />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA: PUZZLE, ATIVIDADE, CONQUISTAS */}
          <div className="flex-1 flex flex-col gap-8 w-full">
            
            {/* SEÇÃO 1: PUZZLE DIÁRIO */}
            <div className={`flex flex-col gap-6 ${activeTab === 'puzzle' ? 'block' : 'hidden lg:flex'}`}>
              <div className="flex items-center gap-3">
                <Activity size={18} className="text-white/30" />
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Puzzle Diário</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0f0a] border border-white/5 p-4 rounded-xl flex flex-col">
                  <span className="text-2xl font-mono font-bold text-orange-500 mb-1">{displayStreak}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Streak Atual</span>
                </div>
                <div className="bg-[#0a0f0a] border border-white/5 p-4 rounded-xl flex flex-col">
                  <span className="text-2xl font-mono font-bold text-verde-grama mb-1">{displayScore}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Pontos Acum.</span>
                </div>
                <div className="bg-[#0a0f0a] border border-white/5 p-4 rounded-xl flex flex-col">
                  <span className="text-2xl font-mono font-bold text-white mb-1">{avgScore}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Média de PTS</span>
                </div>
                <div className="bg-[#0a0f0a] border border-white/5 p-4 rounded-xl flex flex-col">
                  <span className="text-2xl font-mono font-bold text-purple-400 mb-1">{displayFlawless}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Perfeitos</span>
                </div>
              </div>

              {/* GRID DE ATIVIDADE (14 DIAS) */}
              <div className="bg-[#0a0f0a] border border-white/5 p-5 rounded-xl">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Atividade — Últimos 14 Dias</h3>
                <div className="flex items-center gap-1.5 mb-3">
                  {last14Days.map((date, idx) => {
                    const level = getActivityLevel(date);
                    const today = isToday(date);
                    return (
                      <div 
                        key={idx}
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-sm ${
                          today ? 'border-2 border-blue-500' : ''
                        } ${
                          level === 2 ? 'bg-verde-grama shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 
                          level === 1 ? 'bg-red-500/50' : 
                          'bg-white/5'
                        }`}
                        title={formatDate(date.toISOString())}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-[9px] font-mono text-white/30">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-verde-grama rounded-[1px]"></div> Acertou</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 border border-blue-500 bg-transparent rounded-[1px]"></div> Hoje</div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: CONQUISTAS E OVR CHART */}
            <div className={`flex flex-col gap-6 ${activeTab === 'conquistas' ? 'block' : 'hidden lg:flex'}`}>
              
              <div className="flex items-center gap-3">
                <Medal size={18} className="text-white/30" />
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Conquistas</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Conquista 1 */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasInvicto ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasInvicto ? <Trophy size={20} className="text-yellow-500"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasInvicto ? 'text-yellow-500' : 'text-white/30'}`}>Invicto</span>
                </div>
                {/* Conquista 2 */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasStreak ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasStreak ? <Flame size={20} className="text-orange-500"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasStreak ? 'text-orange-500' : 'text-white/30'}`}>7 Dias Seq.</span>
                </div>
                {/* Conquista 3 */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasMultiplayer ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasMultiplayer ? <Users size={20} className="text-blue-400"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasMultiplayer ? 'text-blue-400' : 'text-white/30'}`}>1ª Sala Multi</span>
                </div>
                {/* Conquista 4 */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasOvr90 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasOvr90 ? <Star size={20} className="text-purple-400"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasOvr90 ? 'text-purple-400' : 'text-white/30'}`}>OVR 90+</span>
                </div>
                
                {/* Locked Extra */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasPuzzle30 ? 'bg-verde-grama/10 border-verde-grama/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasPuzzle30 ? <LayoutGrid size={20} className="text-verde-grama"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasPuzzle30 ? 'text-verde-grama' : 'text-white/30'}`}>Puzzle 30x</span>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasGalactico ? 'bg-pink-500/10 border-pink-500/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasGalactico ? <Star size={20} className="text-pink-400"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasGalactico ? 'text-pink-400' : 'text-white/30'}`}>Galáctico</span>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasHatTrick ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasHatTrick ? <Trophy size={20} className="text-yellow-500"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasHatTrick ? 'text-yellow-500' : 'text-white/30'}`}>Hat Trick</span>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${hasTop10 ? 'bg-red-500/10 border-red-500/30' : 'bg-[#050705] border-white/5 opacity-50'}`}>
                  {hasTop10 ? <Medal size={20} className="text-red-500"/> : <Lock size={20} className="text-white/20"/>}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasTop10 ? 'text-red-500' : 'text-white/30'}`}>Top 10</span>
                </div>
              </div>

              {/* OVR POR TEMPORADA CHART */}
              {last4Seasons.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity size={18} className="text-white/30" />
                    <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">OVR por Temporada</h2>
                  </div>
                  
                  <div className="flex flex-col gap-4 bg-[#0a0f0a] border border-white/5 p-5 rounded-xl">
                    {last4Seasons.map((season, idx) => {
                      const colors = ['bg-purple-400', 'bg-verde-grama', 'bg-blue-400', 'bg-orange-500'];
                      const widthPercent = (season.team_overall / maxOvrChart) * 100;
                      return (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white/60">T{draftsPlayed - idx} {idx === 0 ? '• Atual' : ''}</span>
                            <span className="text-white font-bold">{season.team_overall}</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                            <div className={`${colors[idx % colors.length]} transition-all duration-1000`} style={{ width: `${widthPercent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="mt-8 flex justify-center pb-12 w-full gap-4 opacity-50">
           {/* Footer Action buttons */}
           <Link href="/draft">
            <button className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-xl uppercase tracking-wider transition-colors shadow-sm">
              Novo Draft
            </button>
          </Link>
        </div>

      </div>
    </main>
  );
}
