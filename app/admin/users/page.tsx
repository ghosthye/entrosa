"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users as UsersIcon, ShieldAlert, ShieldCheck, Trophy, Target } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

interface AdminUser {
  id: string;
  name: string;
  avatar_url: string;
  role: 'user' | 'admin' | 'super_admin';
  draft_total_matches: number;
  draft_total_goals: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, role: currentUserRole } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePromote = async (userId: string, newRole: string) => {
    if (newRole === 'super_admin') {
      const confirmMsg = "CUIDADO: Você está prestes a dar acesso total a este usuário! Ele poderá deletar outros admins. Confirmar?";
      if (!confirm(confirmMsg)) return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ targetUserId: userId, newRole })
      });
      
      if (!res.ok) {
        const d = await res.json();
        alert('Erro: ' + (d.error || 'Falha ao promover'));
        return;
      }

      alert('Usuário promovido com sucesso!');
      fetchUsers(); // Refresh
    } catch (e) {
      alert('Erro inesperado');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-display text-white uppercase tracking-wide mb-2 flex items-center gap-3">
          <UsersIcon className="text-blue-500" size={32} />
          Gerenciamento de Jogadores
        </h1>
        <p className="text-slate-400">Auditoria de contas, pontuações e escalonamento de privilégios.</p>
      </div>

      <div className="bg-[#040b1c] border border-blue-900/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0a142c] text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-blue-900/30">
              <tr>
                <th className="px-6 py-4">Jogador</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Partidas</th>
                <th className="px-6 py-4">Gols</th>
                <th className="px-6 py-4">Ações Seguras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/20">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <ShieldCheck size={32} className="mb-2 text-blue-900" />
                      Estabelecendo conexão segura com Supabase...
                    </div>
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-blue-900/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar_url || '/placeholder.png'} alt="Avatar" className="w-10 h-10 rounded-full border border-blue-500/30" />
                      <div>
                        <p className="font-bold text-white">{u.name}</p>
                        <p className="text-xs font-mono text-slate-500 truncate w-32" title={u.id}>{u.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'super_admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        <ShieldAlert size={12} /> Super Admin
                      </span>
                    ) : u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <ShieldCheck size={12} /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Jogador
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Trophy size={14} className="text-amarelo-gol" />
                      {u.draft_total_matches || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Target size={14} className="text-green-500" />
                      {u.draft_total_goals || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {currentUserRole === 'super_admin' && u.id !== currentUser?.id && (
                      <div className="flex gap-2">
                        {u.role !== 'admin' && u.role !== 'super_admin' && (
                          <button 
                            onClick={() => handlePromote(u.id, 'admin')}
                            className="text-xs bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/50 px-3 py-1.5 rounded transition-colors"
                          >
                            Tornar Admin
                          </button>
                        )}
                        {u.role === 'admin' && (
                          <button 
                            onClick={() => handlePromote(u.id, 'user')}
                            className="text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/50 px-3 py-1.5 rounded transition-colors"
                          >
                            Rebaixar
                          </button>
                        )}
                      </div>
                    )}
                    {u.id === currentUser?.id && (
                      <span className="text-xs text-slate-500 italic">Esta é a sua conta</span>
                    )}
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
