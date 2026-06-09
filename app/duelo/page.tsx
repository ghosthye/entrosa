"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Swords } from 'lucide-react';

const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];

export default function DueloCreatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [formation, setFormation] = useState('4-3-3');
  const [difficulty, setDifficulty] = useState('Médio');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName: name.trim(),
          settings: {
            formation,
            difficulty
          }
        })
      });
      const data = await res.json();
      
      if (data.duelId) {
        localStorage.setItem(`duel_creator_${data.duelId}`, 'true');
        router.push(`/duelo/${data.duelId}/play?role=creator`);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao criar duelo');
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-lg mt-12 bg-surface border border-border-color p-8 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Swords size={200} />
        </div>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg">
            <Swords size={32} />
          </div>
          <div>
            <h1 className="font-display text-4xl text-primary uppercase tracking-wide">Duelo Online</h1>
            <p className="text-secondary font-medium">Crie a sala e monte seu esquadrão</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-2">Seu Nome / Apelido</label>
            <input 
              type="text" 
              required
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-background border-2 border-border-color rounded-xl px-4 py-3 text-lg font-bold text-primary focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ex: Tite"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-2">Formação Tática</label>
            <select
              value={formation}
              onChange={e => setFormation(e.target.value)}
              className="w-full bg-background border-2 border-border-color rounded-xl px-4 py-3 text-lg font-bold text-primary focus:outline-none focus:border-blue-500 transition-colors"
            >
              {formations.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-2">Regras de Química</label>
            <div className="grid grid-cols-3 gap-2">
              {['Fácil', 'Médio', 'Difícil'].map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`p-3 rounded-xl border-2 font-bold uppercase tracking-wider transition-colors ${
                    difficulty === diff 
                      ? 'bg-blue-600/10 border-blue-600 text-blue-600' 
                      : 'border-border-color text-secondary hover:border-blue-500/50 hover:bg-blue-500/5'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
            <p className="text-xs text-secondary mt-2">
              {difficulty === 'Fácil' && "Ideal para se divertir. Muitas conexões válidas."}
              {difficulty === 'Médio' && "O desafio padrão. Overall (OVR) liberado."}
              {difficulty === 'Difícil' && "Só para experts. OVR Oculto!"}
            </p>
          </div>

          <button 
            type="submit"
            disabled={!name.trim() || isCreating}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-4 rounded-xl uppercase tracking-wider shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCreating ? "Criando Sala..." : "Avançar para o Draft"}
          </button>
        </form>
      </div>
    </main>
  );
}
