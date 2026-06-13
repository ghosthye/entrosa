"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Users, Play, Copy, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export default function DraftLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { user } = useAuth();
  
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Pegar o ID do player local gerado no momento de entrar na sala
    const storedPlayerId = localStorage.getItem(`draft_player_${roomId}`);
    setLocalPlayerId(storedPlayerId);

    const fetchRoom = async () => {
      const { data: roomData, error: roomError } = await supabase
        .from('draft_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
        
      if (roomError) {
        alert('Sala não encontrada');
        router.push('/draft/online');
        return;
      }
      setRoom(roomData);

      const { data: playersData } = await supabase
        .from('draft_room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
        
      if (playersData) setPlayers(playersData);
    };

    fetchRoom();

    // Subscribe to changes in players
    const playersChannel = supabase.channel(`room_${roomId}_players`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_room_players', filter: `room_id=eq.${roomId}` }, (payload) => {
        fetchRoom(); // fetch everything again to ensure consistency
      })
      .subscribe();
      
    // Subscribe to changes in room status
    const roomChannel = supabase.channel(`room_${roomId}_status`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'draft_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new.status === 'drafting') {
          router.push(`/draft/online/${roomId}/build`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, router]);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.short_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartDraft = async () => {
    if (!room) return;
    
    // Altera o status da sala para drafting
    const { error } = await supabase
      .from('draft_rooms')
      .update({ status: 'drafting' })
      .eq('id', roomId);
      
    if (error) {
      alert('Erro ao iniciar o draft: ' + error.message);
    }
  };

  const handleLeaveRoom = async () => {
    if (localPlayerId) {
      await supabase.from('draft_room_players').delete().eq('id', localPlayerId);
      localStorage.removeItem(`draft_player_${roomId}`);
    }
    router.push('/draft/online');
  };

  if (!room) {
    return <div className="min-h-screen bg-[var(--bg-background)] flex items-center justify-center text-[var(--text-primary)] font-bold text-2xl uppercase tracking-wider animate-pulse">Carregando Lobby...</div>;
  }

  const isHost = players.find(p => p.id === localPlayerId)?.is_host || false;

  return (
    <main className="min-h-screen bg-[var(--bg-background)] flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-4xl mt-12 bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.15)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Esquerda: Infos da Sala */}
          <div className="flex-1 space-y-8 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="font-display text-4xl text-[var(--text-primary)] uppercase tracking-wide mb-2">Sala de Espera</h1>
                <div className="flex flex-wrap gap-2 text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span className="bg-blue-600/20 text-blue-500 px-3 py-1 rounded-lg">
                    {room.mode === 'brasileirao' ? 'Brasileirão' : 'Copa do Mundo'}
                  </span>
                  <span className="bg-purple-600/20 text-purple-500 px-3 py-1 rounded-lg">
                    Formato: {room.format}
                  </span>
                  <span className="bg-[var(--bg-background)] border border-[var(--border-color)] px-3 py-1 rounded-lg">
                    Skips: {room.settings.skips === 999 ? 'Infinito' : room.settings.skips}
                  </span>
                </div>
              </div>
              <button onClick={handleLeaveRoom} className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Sair da Sala">
                <LogOut size={24} />
              </button>
            </div>

            <div className="bg-[var(--bg-background)] border-2 border-[var(--border-color)] rounded-2xl p-6 text-center">
              <p className="text-[var(--text-secondary)] font-bold uppercase tracking-wider text-sm mb-2">Código da Sala</p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-5xl font-mono font-bold text-[var(--text-primary)] tracking-[0.2em]">{room.short_code}</span>
                <button 
                  onClick={handleCopyCode}
                  className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-xl hover:bg-blue-600/20 transition-colors text-[var(--text-primary)]"
                >
                  {copied ? <CheckCircle2 className="text-green-500" /> : <Copy />}
                </button>
              </div>
            </div>
            
            {isHost ? (
              <button 
                onClick={handleStartDraft}
                className="w-full bg-amarelo-gol hover:bg-yellow-400 text-black font-bold text-xl py-5 rounded-xl uppercase tracking-wider transition-transform active:scale-95 shadow-[0_10px_30px_rgba(255,214,0,0.3)] flex items-center justify-center gap-3"
              >
                <Play size={24} /> Iniciar Draft
              </button>
            ) : (
              <div className="bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-secondary)] font-bold text-center py-5 rounded-xl uppercase tracking-wider animate-pulse">
                Aguardando o Líder iniciar...
              </div>
            )}
          </div>

          {/* Direita: Jogadores */}
          <div className="flex-1 bg-[var(--bg-background)] rounded-2xl p-6 border border-[var(--border-color)] h-[400px] flex flex-col relative z-10">
            <h2 className="font-display text-2xl text-[var(--text-primary)] uppercase tracking-wide mb-6 flex items-center gap-2">
              <Users className="text-blue-500" /> Jogadores ({players.length})
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {players.map((p, i) => (
                <div key={p.id} className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {p.player_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-lg text-[var(--text-primary)]">
                      {p.player_name} {p.id === localPlayerId && "(Você)"}
                    </span>
                  </div>
                  {p.is_host && (
                    <span className="text-xs bg-amarelo-gol/20 text-yellow-500 px-2 py-1 rounded-full uppercase font-bold tracking-wider border border-yellow-500/50">Líder</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
