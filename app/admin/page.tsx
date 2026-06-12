"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Trophy, Target, Activity } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalDrafts: number;
  totalGoals: number;
  activeSaves: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDrafts: 0,
    totalGoals: 0,
    activeSaves: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Obter número de usuários e agregar estatísticas
        const { data: profiles, error: err1 } = await supabase.from('profiles').select('draft_total_matches, draft_total_goals');
        
        let totalDrafts = 0;
        let totalGoals = 0;
        if (profiles) {
          profiles.forEach(p => {
            totalDrafts += p.draft_total_matches || 0;
            totalGoals += p.draft_total_goals || 0;
          });
        }

        // Obter número de saves ativos
        const { count: savesCount, error: err2 } = await supabase.from('saves').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');

        setStats({
          totalUsers: profiles?.length || 0,
          totalDrafts,
          totalGoals,
          activeSaves: savesCount || 0
        });
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Jogadores" 
          value={stats.totalUsers} 
          icon={Users} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Drafts Jogados" 
          value={stats.totalDrafts} 
          icon={Trophy} 
          color="bg-amarelo-gol" 
        />
        <StatCard 
          title="Gols Marcados" 
          value={stats.totalGoals} 
          icon={Target} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Saves em Andamento" 
          value={stats.activeSaves} 
          icon={Activity} 
          color="bg-purple-500" 
        />
      </div>

      <div className="mt-12 bg-[#040b1c] border border-blue-900/30 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="text-blue-500" /> Atividade Recente do Sistema
        </h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-blue-900/20 rounded-lg"></div>
            <div className="h-12 bg-blue-900/20 rounded-lg"></div>
            <div className="h-12 bg-blue-900/20 rounded-lg"></div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p>O módulo de logs de auditoria detalhados será construído na Etapa 5.</p>
            <p className="text-sm mt-2">Neste momento, as conexões base do Painel Administrativo estão 100% operacionais.</p>
          </div>
        )}
      </div>
    </div>
  );
}
