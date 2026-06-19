"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Trophy, Target, Activity } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalDrafts: number;
  totalGoals: number;
  activeSaves: number;
  onlinePlayers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDrafts: 0,
    totalGoals: 0,
    activeSaves: 0,
    onlinePlayers: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Obter número de usuários e agregar estatísticas
        const { data: profiles, error: err1 } = await supabase.from('profiles').select('id, name, draft_total_matches, draft_total_goals, updated_at');
        
        let totalDrafts = 0;
        let totalGoals = 0;
        if (profiles) {
          profiles.forEach(p => {
            totalDrafts += p.draft_total_matches || 0;
            totalGoals += p.draft_total_goals || 0;
          });
        }

        // Obter número de saves ativos e os saves mais recentes
        const { data: saves, count: savesCount } = await supabase.from('saves')
          .select('mode, status, last_synced_at, profiles(name)', { count: 'exact' });

        const activeSavesCount = saves ? saves.filter(s => s.status === 'in_progress').length : 0;

        // Obter os duelos mais recentes
        const { data: duels } = await supabase.from('duels')
          .select('creator_name, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        // Obter as pessoas em salas multiplayer (proxy para online)
        const { data: roomPlayers } = await supabase.from('draft_room_players').select('id');

        setStats({
          totalUsers: profiles?.length || 0,
          totalDrafts,
          totalGoals,
          activeSaves: activeSavesCount,
          onlinePlayers: roomPlayers?.length || 0
        });

        // Montar a timeline de atividades
        let feed: any[] = [];
        
        // Usuários Ativos (Logaram Recentemente)
        if (profiles) {
          const activeUsers = profiles
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 10)
            .map(p => ({
              id: `user_${p.id}`,
              type: 'new_user',
              title: 'Atividade de Jogador',
              desc: `${p.name} logou recentemente no Entrosa.`,
              time: p.updated_at,
              icon: Users,
              color: 'text-green-400 bg-green-400/20'
            }));
          feed = [...feed, ...activeUsers];
        }

        // Saves Atualizados
        if (saves) {
          const recentSaves = saves
            .sort((a, b) => new Date(b.last_synced_at).getTime() - new Date(a.last_synced_at).getTime())
            .slice(0, 10)
            .map((s, i) => ({
              id: `save_${i}`,
              type: 'save',
              title: s.status === 'finished' ? 'Torneio Finalizado' : 'Progresso Salvo',
              desc: `${(s.profiles as any)?.name || 'Jogador'} ${s.status === 'finished' ? 'terminou' : 'avançou'} no modo ${s.mode === 'brasileirao' ? 'Brasileirão' : 'Copa'}.`,
              time: s.last_synced_at,
              icon: Trophy,
              color: s.status === 'finished' ? 'text-amarelo-gol bg-amarelo-gol/20' : 'text-blue-400 bg-blue-400/20'
            }));
          feed = [...feed, ...recentSaves];
        }

        // Duelos
        if (duels) {
          const recentDuels = duels.map((d, i) => ({
            id: `duel_${i}`,
            type: 'duel',
            title: 'Novo Duelo Criado',
            desc: `${d.creator_name} criou uma sala de x1 e está aguardando um adversário.`,
            time: d.created_at,
            icon: Target,
            color: 'text-purple-400 bg-purple-400/20'
          }));
          feed = [...feed, ...recentDuels];
        }

        // Ordenar tudo cronologicamente
        feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivities(feed.slice(0, 8)); // Mostrar só as 8 últimas ações gerais

      } catch (e) {
        console.error("Error loading admin stats", e);
      } finally {
        setLoading(false);
      }
    }
    
    loadStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
    <div className="bg-[#040b1c] border border-blue-900/30 p-6 rounded-2xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 opacity-20 group-hover:opacity-40 transition-opacity ${color}`}></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 font-medium mb-1">{title}</p>
          <h3 className="text-4xl font-display text-white">{loading ? '...' : value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color.replace('bg-', 'bg-').replace('/10', '/20')} text-white`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-display text-white uppercase tracking-wide mb-2">Visão Geral</h1>
        <p className="text-slate-400">Métricas e estatísticas em tempo real da base de jogadores.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Total de Jogadores" value={stats.totalUsers} icon={Users} color="bg-blue-500/10" />
        <StatCard title="Jogadores Online" value={stats.onlinePlayers} icon={Activity} color="bg-green-500/10" />
        <StatCard title="Drafts Jogados" value={stats.totalDrafts} icon={Trophy} color="bg-amarelo-gol/10" />
        <StatCard title="Gols Marcados" value={stats.totalGoals} icon={Target} color="bg-green-500/10" />
        <StatCard title="Saves em Andamento" value={stats.activeSaves} icon={Activity} color="bg-purple-500/10" />
      </div>

      <div className="mt-12 bg-[#040b1c] border border-blue-900/30 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="text-blue-500" /> Atividade Recente do Sistema
        </h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-blue-900/20 rounded-lg"></div>
            <div className="h-16 bg-blue-900/20 rounded-lg"></div>
            <div className="h-16 bg-blue-900/20 rounded-lg"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((act) => {
              const Icon = act.icon;
              const date = new Date(act.time);
              const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString('pt-BR');
              
              return (
                <div key={act.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-blue-900/10 transition-colors border border-transparent hover:border-blue-900/30 group">
                  <div className={`p-3 rounded-full mt-1 ${act.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold">{act.title}</h4>
                    <p className="text-slate-400 text-sm mt-1">{act.desc}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 font-mono group-hover:text-blue-400 transition-colors">
                    <div>{timeStr}</div>
                    <div>{dateStr}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p>Nenhuma atividade recente encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
