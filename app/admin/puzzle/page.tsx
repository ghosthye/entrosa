"use client";

import { useEffect, useState } from 'react';
import { SearchInput, PlayerSearchResult } from '@/components/SearchInput';
import { supabase } from '@/lib/supabase';
import { Puzzle, Plus, Trash2, Calendar, Layout, User as UserIcon, X } from 'lucide-react';

interface DailyPuzzle {
  id: number;
  date: string;
  formation: string;
  starting_player_id: string;
  created_at: string;
}

export default function AdminPuzzlePage() {
  const [puzzles, setPuzzles] = useState<DailyPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [date, setDate] = useState('');
  const [formation, setFormation] = useState('4-3-3');
  const [startingPlayerId, setStartingPlayerId] = useState('');
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPuzzles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/puzzle', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch puzzles');
      const data = await res.json();
      setPuzzles(data.puzzles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    
    fetchPuzzles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startingPlayerId) {
      alert('Selecione um jogador primeiro!');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/puzzle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ date, formation, starting_player_id: startingPlayerId })
      });
      
      if (!res.ok) {
        const d = await res.json();
        alert('Erro: ' + (d.error || 'Falha ao criar'));
        return;
      }

      alert('Desafio agendado com sucesso!');
      setStartingPlayerId('');
      setSelectedPlayerName('');
      fetchPuzzles();
    } catch (e) {
      alert('Erro inesperado ao criar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este desafio diário?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/puzzle', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id })
      });
      
      if (!res.ok) throw new Error('Falha ao deletar');
      fetchPuzzles();
    } catch (e) {
      alert('Erro ao deletar');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-display text-white uppercase tracking-wide mb-2 flex items-center gap-3">
          <Puzzle className="text-blue-500" size={32} />
          Daily Puzzle
        </h1>
        <p className="text-slate-400">Agende os desafios diários da comunidade na nuvem.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Criação */}
        <div className="bg-[#040b1c] border border-blue-900/30 rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Plus className="text-blue-500" /> Novo Desafio
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                <Calendar size={16} /> Data do Desafio
              </label>
              <input 
                type="date" 
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#0a142c] border border-blue-900/50 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                <Layout size={16} /> Formação Tática
              </label>
              <select 
                value={formation}
                onChange={e => setFormation(e.target.value)}
                className="w-full bg-[#0a142c] border border-blue-900/50 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="4-3-3">4-3-3 Clássico</option>
                <option value="4-4-2">4-4-2 Inglês</option>
                <option value="3-5-2">3-5-2</option>
                <option value="4-2-3-1">4-2-3-1</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                <UserIcon size={16} /> Jogador Alvo (Craque)
              </label>
              {startingPlayerId ? (
                <div className="w-full bg-[#0a142c] border border-blue-500/50 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-white font-bold">{selectedPlayerName}</span>
                    <span className="text-xs text-slate-400 font-mono">{startingPlayerId}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setStartingPlayerId(''); setSelectedPlayerName(''); }}
                    className="text-slate-400 hover:text-red-400 p-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="mt-2" style={{ color: 'black' }}>
                  <SearchInput 
                    onSelect={(p: PlayerSearchResult) => {
                      setStartingPlayerId(p.id);
                      setSelectedPlayerName(p.name);
                    }} 
                  />
                </div>
              )}
            </div>
            
            <button 
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Agendando...' : 'Agendar Desafio'}
            </button>
          </form>
        </div>

        {/* Lista de Puzzles */}
        <div className="lg:col-span-2 bg-[#040b1c] border border-blue-900/30 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-blue-900/30">
            <h2 className="text-xl font-bold text-white">Cronograma Oficial</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0a142c] text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-blue-900/30">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Formação</th>
                  <th className="px-6 py-4">Jogador Alvo</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/20">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Carregando agenda...
                    </td>
                  </tr>
                ) : puzzles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Nenhum desafio agendado na nuvem.
                    </td>
                  </tr>
                ) : puzzles.map((p) => {
                  const isPast = new Date(p.date) < new Date(new Date().toDateString());
                  const isToday = p.date === new Date().toISOString().split('T')[0];

                  return (
                    <tr key={p.id} className={`transition-colors ${isPast ? 'opacity-50' : 'hover:bg-blue-900/10'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isToday ? 'text-amarelo-gol' : 'text-white'}`}>
                            {new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          {isToday && <span className="text-[10px] bg-amarelo-gol/20 text-amarelo-gol px-2 py-0.5 rounded-full font-bold uppercase">Hoje</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono">{p.formation}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg font-mono text-xs border border-slate-700">
                          {p.starting_player_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-2"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
