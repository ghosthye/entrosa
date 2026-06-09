"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Swords, Copy, CheckCircle2, Trophy, ArrowRight, Check, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Field } from '@/components/Field';
import { formationsMap } from '@/lib/formations';
import { DuelMatchSimulation } from '@/components/DuelMatchSimulation';
import { useAuth } from '@/lib/useAuth';

const buildNodes2D = (chain: any[], formation: string) => {
  const formationRows = formationsMap[formation] || formationsMap['4-3-3'];
  const grid: any[][] = [];
  for (let i = 0; i < formationRows.length; i++) grid.push([]);
  
  let idCounter = 0;
  for (let r = formationRows.length - 1; r >= 0; r--) {
    for (let c = 0; c < formationRows[r].length; c++) {
      const slotId = `slot-${idCounter++}`;
      const chainNode = chain.find((n: any) => n.slotId === slotId);
      
      grid[r][c] = {
        id: slotId,
        position: formationRows[r][c],
        status: chainNode ? 'filled' : 'empty',
        playerName: chainNode ? chainNode.player.name : undefined,
        playerCountry: chainNode ? chainNode.player.country : undefined,
        playerOvr: chainNode ? chainNode.player.overall : undefined,
        faceUrl: chainNode ? chainNode.player.face_url : undefined,
      };
    }
  }
  return grid;
};

export default function DuelLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  
  const [duel, setDuel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const defaultName = user && !user.is_anonymous ? user.user_metadata?.full_name?.split(' ')[0] : '';
  const [challengerName, setChallengerName] = useState(defaultName);
  const [copied, setCopied] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isReadying, setIsReadying] = useState(false);

  React.useEffect(() => {
    if (user && !user.is_anonymous && !challengerName) {
      setChallengerName(user.user_metadata?.full_name?.split(' ')[0] || '');
    }
  }, [user]);

  useEffect(() => {
    setIsCreator(localStorage.getItem(`duel_creator_${id}`) === 'true');
  }, [id]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fetchDuel = () => {
      fetch(`/api/duel?id=${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            alert('Duelo não encontrado');
            router.push('/duelo');
            return;
          }
          setDuel(data);
          setLoading(false);
          
          const isCreatorLocal = localStorage.getItem(`duel_creator_${id}`) === 'true';
          
          if (data.status === 'pending' && isCreatorLocal) {
             timeoutId = setTimeout(fetchDuel, 3000);
          } else if (data.status === 'finished' && (!data.settings.creatorReady || !data.settings.challengerReady)) {
             // Polling while waiting for both players to press ready
             timeoutId = setTimeout(fetchDuel, 3000);
          }
        });
    };
    
    fetchDuel();
    
    return () => clearTimeout(timeoutId);
  }, [id, router]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold text-2xl uppercase tracking-wider animate-pulse">Carregando Sala...</div>;
  }

  const handleCopy = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengerName.trim()) return;
    router.push(`/duelo/${id}/play?role=challenger&name=${encodeURIComponent(challengerName.trim())}`);
  };

  const handleReady = async () => {
    setIsReadying(true);
    await fetch('/api/duel/ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duelId: id, role: isCreator ? 'creator' : 'challenger' })
    });
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className={`w-full ${duel.status === 'finished' ? 'w-full -mt-2 sm:-mt-6' : 'max-w-2xl mt-8'}`}>
        {duel.status === 'creating' && (
          <div className="bg-surface border border-border-color p-8 rounded-3xl text-center shadow-lg">
            <Swords size={64} className="mx-auto text-blue-500 mb-6 animate-pulse" />
            <h1 className="font-display text-3xl text-primary uppercase mb-4">Sala em Preparação</h1>
            <p className="text-secondary text-lg">O criador da sala ({duel.creator_name}) ainda está montando o esquadrão dele. Aguarde...</p>
            <button onClick={() => window.location.reload()} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl uppercase transition-colors">
              Atualizar Status
            </button>
          </div>
        )}

        {duel.status === 'pending' && (
          <div className="bg-surface border border-border-color p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(37,99,235,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Swords size={200} />
            </div>
            
            <h1 className="font-display text-4xl text-primary uppercase mb-2 text-blue-500">Duelo Online</h1>
            <p className="text-xl font-bold text-primary mb-8">{duel.creator_name} lançou um desafio!</p>
            
            <div className="bg-background border-2 border-border-color rounded-2xl p-6 mb-8 text-left relative z-10">
              <h3 className="font-bold text-secondary uppercase tracking-wider text-sm mb-4">Configurações da Partida</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-cinza-borda font-bold uppercase">Formação</span>
                  <span className="text-lg font-bold text-primary">{duel.settings.formation}</span>
                </div>
                <div>
                  <span className="block text-xs text-cinza-borda font-bold uppercase">Dificuldade</span>
                  <span className="text-lg font-bold text-primary">{duel.settings.difficulty}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-600/10 border border-blue-600/30 rounded-2xl p-6 mb-8 relative z-10">
              <h3 className="font-bold text-blue-600 uppercase tracking-wider text-sm mb-4 flex items-center justify-center gap-2">
                Espera pelo Desafiante
              </h3>
              <p className="text-secondary text-sm mb-4">Compartilhe este link com seu amigo para ele tentar bater seu esquadrão:</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={typeof window !== 'undefined' ? window.location.href : ''} 
                  className="flex-1 bg-background border border-border-color rounded-xl px-4 py-2 text-sm text-primary focus:outline-none"
                />
                <button 
                  onClick={handleCopy}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors flex items-center justify-center min-w-[50px]"
                >
                  {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            {!isCreator ? (
              <form onSubmit={startChallenge} className="relative z-10 border-t-2 border-border-color pt-8">
                <h3 className="font-bold text-primary text-xl mb-4">É você o desafiante?</h3>
                <div className="flex flex-col gap-4">
                  {user && !user.is_anonymous ? (
                    <div className="flex items-center gap-3 bg-surface border-2 border-green-500/50 rounded-xl px-4 py-4 justify-center">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" />
                      ) : (
                        <UserCircle2 className="text-green-500" />
                      )}
                      <span className="text-lg font-bold text-primary">Jogando como: {challengerName}</span>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      required
                      placeholder="Digite seu nome para aceitar..."
                      value={challengerName}
                      onChange={e => setChallengerName(e.target.value)}
                      className="w-full bg-background border-2 border-border-color rounded-xl px-4 py-4 text-lg font-bold text-primary focus:outline-none focus:border-red-500 transition-colors text-center"
                    />
                  )}
                  <button 
                    type="submit"
                    disabled={!challengerName.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xl py-4 rounded-xl uppercase tracking-wider shadow-[0_10px_20px_rgba(220,38,38,0.3)] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Aceitar Desafio <ArrowRight size={20} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="relative z-10 border-t-2 border-border-color pt-8 text-center">
                <h3 className="font-bold text-primary text-xl mb-2">Aguardando seu amigo...</h3>
                <p className="text-secondary">Assim que ele acessar o link e montar o time, o resultado aparecerá aqui nesta tela! Você pode deixar esta aba aberta.</p>
              </div>
            )}
          </div>
        )}

        {duel.status === 'finished' && (
          <div className="space-y-6 w-full max-w-7xl mx-auto flex flex-col items-center">
            {(!duel.settings.creatorReady || !duel.settings.challengerReady) ? (
              <div className="bg-surface border border-border-color p-8 rounded-3xl text-center shadow-lg max-w-2xl mx-auto">
                <h1 className="font-display text-4xl text-primary uppercase mb-2 text-amarelo-gol">Equipes Definidas!</h1>
                <p className="text-xl font-bold text-primary mb-8">Ambos os técnicos já escalaram seus elencos. A bola vai rolar!</p>
                
                <div className="bg-background border-2 border-border-color rounded-2xl p-6 mb-8 text-left">
                  <div className="flex justify-between items-center border-b border-border-color pb-4 mb-4">
                    <span className="text-lg font-bold text-primary uppercase">{duel.creator_name}</span>
                    {duel.settings.creatorReady ? (
                      <span className="bg-verde-grama/20 text-verde-grama px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1"><Check size={14} /> Pronto</span>
                    ) : (
                      <span className="bg-white/5 text-secondary px-3 py-1 rounded-full text-xs font-bold uppercase animate-pulse">Escalando...</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary uppercase">{duel.challenger_name}</span>
                    {duel.settings.challengerReady ? (
                      <span className="bg-verde-grama/20 text-verde-grama px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1"><Check size={14} /> Pronto</span>
                    ) : (
                      <span className="bg-white/5 text-secondary px-3 py-1 rounded-full text-xs font-bold uppercase animate-pulse">Escalando...</span>
                    )}
                  </div>
                </div>

                {isCreator && !duel.settings.creatorReady && (
                   <button onClick={handleReady} disabled={isReadying} className="w-full bg-verde-grama hover:bg-green-500 text-black font-bold text-xl py-4 rounded-xl uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50">
                     {isReadying ? 'Aguarde...' : 'ESTOU PRONTO!'}
                   </button>
                )}
                
                {!isCreator && !duel.settings.challengerReady && (
                   <button onClick={handleReady} disabled={isReadying} className="w-full bg-verde-grama hover:bg-green-500 text-black font-bold text-xl py-4 rounded-xl uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50">
                     {isReadying ? 'Aguarde...' : 'ESTOU PRONTO!'}
                   </button>
                )}
                
                {((isCreator && duel.settings.creatorReady) || (!isCreator && duel.settings.challengerReady)) && (
                   <div className="text-center text-secondary mt-6 animate-pulse">Aguardando seu adversário dar o "Pronto"...</div>
                )}
              </div>
            ) : (
              <DuelMatchSimulation 
                duel={duel} 
                isCreator={isCreator} 
                onSimulationComplete={() => window.location.href = '/duelo'} 
                buildNodes2D={buildNodes2D}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
