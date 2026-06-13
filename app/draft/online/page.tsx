"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Globe, Plus, LogIn, Users } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export default function DraftOnlinePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  const defaultName = user && !user.is_anonymous ? user.user_metadata?.full_name?.split(' ')[0] : '';
  const [name, setName] = useState(defaultName);
  const [teamName, setTeamName] = useState('');
  
  // Create State
  const [mode, setMode] = useState('brasileirao');
  const [format, setFormat] = useState('liga');
  const [skips, setSkips] = useState('3');
  const [difficulty, setDifficulty] = useState('hard');
  const [twoLegs, setTwoLegs] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Join State
  const [shortCode, setShortCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  React.useEffect(() => {
    if (user && !user.is_anonymous && !name) {
      setName(user.user_metadata?.full_name?.split(' ')[0] || '');
    }
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamName.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('/api/draft-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          format,
          settings: { skips: parseInt(skips), twoLegs, difficulty },
          hostName: name.trim(),
          teamName: teamName.trim(),
          hostId: user?.id || null
        })
      });
      const data = await res.json();
      
      if (data.roomId) {
        localStorage.setItem(`draft_player_${data.roomId}`, data.playerId);
        router.push(`/draft/online/${data.roomId}/lobby`);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      alert('Erro ao criar sala: ' + e.message);
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamName.trim() || !shortCode.trim()) return;
    
    setIsJoining(true);
    try {
      const res = await fetch('/api/draft-online', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortCode: shortCode.trim(),
          playerName: name.trim(),
          teamName: teamName.trim(),
          playerId: user?.id || null
        })
      });
      const data = await res.json();
      
      if (data.roomId) {
        localStorage.setItem(`draft_player_${data.roomId}`, data.playerId);
        router.push(`/draft/online/${data.roomId}/lobby`);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      alert('Erro ao entrar na sala: ' + e.message);
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-background)] flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-2xl mt-12 bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.15)] relative overflow-hidden text-[var(--text-primary)]">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Globe size={200} />
        </div>
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg">
            <Globe size={32} />
          </div>
          <div>
            <h1 className="font-display text-4xl uppercase tracking-wide">Draft Online</h1>
            <p className="text-[var(--text-secondary)] font-medium">Jogue Ligas ou Finais simultâneas com seus amigos</p>
          </div>
        </div>

        <div className="flex gap-4 mb-8 relative z-10">
          <button 
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'create' ? 'bg-blue-600 text-white' : 'bg-[var(--bg-background)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white'}`}
          >
            <Plus size={20} /> Criar Sala
          </button>
          <button 
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'join' ? 'bg-amarelo-gol text-black' : 'bg-[var(--bg-background)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white'}`}
          >
            <LogIn size={20} /> Entrar com Código
          </button>
        </div>

        {/* Global Identity Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative z-10">
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Seu Nome / Apelido</label>
            <input 
              type="text" 
              required
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ex: Tite"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Nome do seu Time</label>
            <input 
              type="text" 
              required
              maxLength={25}
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ex: Flamenguistas FC"
            />
          </div>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-6 relative z-10 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Tema do Draft</label>
                <select value={mode} onChange={e => setMode(e.target.value)} className="w-full bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="brasileirao">Times Brasileiros</option>
                  <option value="worldcup">Seleções da Copa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Formato</label>
                <select value={format} onChange={e => setFormat(e.target.value)} className="w-full bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="liga">Liga Completa (IAs)</option>
                  <option value="final">Final / Mata-Mata</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Dificuldade</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="easy">Fácil (Mostra OVR)</option>
                  <option value="hard">Difícil (OVR Oculto)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Skips (Pulos)</label>
                <select value={skips} onChange={e => setSkips(e.target.value)} className="w-full bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="3">3 Skips</option>
                  <option value="5">5 Skips</option>
                  <option value="999">Infinitos</option>
                  <option value="0">Sem Skips (Hardcore)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {format === 'final' && (
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Formato da Final</label>
                  <button type="button" onClick={() => setTwoLegs(!twoLegs)} className={`w-full py-3 px-4 rounded-xl font-bold uppercase transition-colors border-2 ${twoLegs ? 'bg-blue-600/10 border-blue-600 text-blue-500' : 'bg-[var(--bg-background)] border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                    {twoLegs ? 'Ida e Volta' : 'Jogo Único'}
                  </button>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={!name.trim() || isCreating}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-4 rounded-xl uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50"
            >
              {isCreating ? "Criando Sala..." : "Criar Nova Sala"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-6 relative z-10 animate-fade-in">
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Código da Sala (6 Letras)</label>
              <input 
                type="text" 
                required
                maxLength={6}
                value={shortCode}
                onChange={e => setShortCode(e.target.value.toUpperCase())}
                className="w-full bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-xl px-4 py-4 text-2xl font-mono text-center tracking-[0.5em] font-bold focus:outline-none focus:border-amarelo-gol transition-colors uppercase placeholder:tracking-normal placeholder:text-sm placeholder:font-sans"
                placeholder="Ex: A7X9WQ"
              />
            </div>
            
            <button 
              type="submit"
              disabled={!name.trim() || shortCode.length !== 6 || isJoining}
              className="w-full mt-4 bg-amarelo-gol hover:bg-yellow-400 text-black font-bold text-xl py-4 rounded-xl uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50"
            >
              {isJoining ? "Entrando..." : "Entrar na Sala"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
