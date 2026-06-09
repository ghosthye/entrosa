"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import GameClient from '@/app/jogar/GameClient';

export default function DuelPlayPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const role = searchParams.get('role');
  const playerName = searchParams.get('name'); // only for challenger
  
  const [duel, setDuel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      });
  }, [id, router]);

  const handleDuelComplete = async (chain: any[], score: number) => {
    try {
      const res = await fetch('/api/duel/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId: id,
          role,
          team: chain,
          score,
          playerName
        })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push(`/duelo/${id}`);
      } else {
        alert('Erro ao salvar esquadrão: ' + data.error);
      }
    } catch (e) {
      alert('Erro de conexão ao salvar esquadrão');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold text-2xl uppercase tracking-wider animate-pulse">Carregando Duelo...</div>;
  }

  // Prepara o puzzle falso baseado nas configurações do duelo
  const duelPuzzle = {
    formation: duel.settings.formation,
    puzzleNumber: 0, // 0 indica modo livre/duelo
  };

  return (
    <GameClient 
      mode="livre"
      puzzle={duelPuzzle}
      onDuelComplete={handleDuelComplete}
      isDuel={true}
      initialDifficulty={duel.settings.difficulty}
    />
  );
}
