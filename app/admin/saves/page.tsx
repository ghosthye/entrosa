"use client";

import { useEffect, useState } from 'react';
import { Trophy, Clock, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminSavesPage() {
  const [saves, setSaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSaves() {
      try {
        const { data } = await supabase
          .from('saves')
          .select('id, mode, status, custom_team_name, team_overall, last_synced_at, profiles(name)')
          .order('last_synced_at', { ascending: false })
          .limit(20);
        
        if (data) setSaves(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSaves();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-display text-white uppercase tracking-wide mb-2 flex items-center gap-3">
          <Trophy className="text-blue-500" size={32} />
          Saves em Andamento
        </h1>
        <p className="text-slate-400">Monitoramento dos campeonatos e drafts ativos na plataforma.</p>
      </div>

      <div className="bg-[#040b1c] border border-blue-900/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0a142c] text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-blue-900/30">
              <tr>
                <th className="px-6 py-4">Jogador</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Modo</th>
                <th className="px-6 py-4">OVR</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/20">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Carregando saves...</td></tr>
              ) : saves.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhum save encontrado.</td></tr>
              ) : saves.map((s) => (
                <tr key={s.id} className="hover:bg-blue-900/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{s.profiles?.name || 'Desconhecido'}</td>
                  <td className="px-6 py-4 text-slate-300">{s.custom_team_name}</td>
                  <td className="px-6 py-4 text-slate-400 uppercase font-mono text-xs">{s.mode}</td>
                  <td className="px-6 py-4 text-amarelo-gol font-bold">{s.team_overall}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-mono border ${s.status === 'finished' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                    <Clock size={14} /> {new Date(s.last_synced_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
